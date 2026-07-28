import { Component, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { useSession } from '@features/auth-session';

import { RenderErrorState } from './RouteStates';
import { routeForPath } from './route-registry';

interface RenderBoundaryProps {
  children: ReactNode;
  resetKey: string;
  onErrorStateChange?: (hasError: boolean) => void;
}

interface RenderBoundaryState {
  hasError: boolean;
}

interface RouteErrorBoundaryProps {
  children: ReactNode;
}

interface ApplicationTitleBoundaryProps {
  children: ReactNode;
}

type ApplicationTitleState =
  | { kind: 'render-error' }
  | { kind: 'bootstrapping' }
  | { kind: 'session-error' }
  | { kind: 'registered-route'; routeTitle: string }
  | { kind: 'not-found' };

export class RenderErrorBoundary extends Component<RenderBoundaryProps, RenderBoundaryState> {
  state: RenderBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RenderBoundaryState {
    return { hasError: true };
  }

  componentDidUpdate(previousProps: RenderBoundaryProps, previousState: RenderBoundaryState) {
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
      return;
    }
    if (this.state.hasError !== previousState.hasError) {
      this.props.onErrorStateChange?.(this.state.hasError);
    }
  }

  componentDidCatch() {
    this.props.onErrorStateChange?.(true);
  }

  private readonly retry = () => {
    this.setState({ hasError: false }, () => this.props.onErrorStateChange?.(false));
  };

  render() {
    if (this.state.hasError) return <RenderErrorState onRetry={this.retry} />;
    return this.props.children;
  }
}

export function RouteErrorBoundary({ children }: RouteErrorBoundaryProps) {
  const location = useLocation();
  const resetKey = `${location.pathname}${location.search}${location.hash}`;
  return <RenderErrorBoundary resetKey={resetKey}>{children}</RenderErrorBoundary>;
}

function resolveApplicationTitle(state: ApplicationTitleState): string {
  switch (state.kind) {
    case 'render-error':
      return 'Something went wrong | LearnHub';
    case 'bootstrapping':
      return 'Preparing your workspace | LearnHub';
    case 'session-error':
      return 'Session check failed | LearnHub';
    case 'registered-route':
      return `${state.routeTitle} | LearnHub`;
    case 'not-found':
      return 'Page not found | LearnHub';
  }
}

export function ApplicationTitleBoundary({ children }: ApplicationTitleBoundaryProps) {
  const { state: sessionState } = useSession();
  const location = useLocation();
  const [hasRenderError, setHasRenderError] = useState(false);
  const route = routeForPath(location.pathname);
  const titleState: ApplicationTitleState = hasRenderError
    ? { kind: 'render-error' }
    : sessionState.status === 'bootstrapping'
      ? { kind: 'bootstrapping' }
      : sessionState.status === 'error'
        ? { kind: 'session-error' }
        : route
          ? { kind: 'registered-route', routeTitle: route.title }
          : { kind: 'not-found' };
  const title = resolveApplicationTitle(titleState);
  const resetKey = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <RenderErrorBoundary resetKey={resetKey} onErrorStateChange={setHasRenderError}>
      {children}
    </RenderErrorBoundary>
  );
}
