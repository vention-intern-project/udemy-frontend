import { Component, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { RenderErrorState } from './RouteStates';

interface RenderBoundaryProps {
  children: ReactNode;
  resetKey: string;
}

interface RenderBoundaryState {
  hasError: boolean;
}

export class RenderErrorBoundary extends Component<RenderBoundaryProps, RenderBoundaryState> {
  state: RenderBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RenderBoundaryState {
    return { hasError: true };
  }

  componentDidUpdate(previousProps: RenderBoundaryProps) {
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  private readonly retry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) return <RenderErrorState onRetry={this.retry} />;
    return this.props.children;
  }
}

export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  const resetKey = `${location.pathname}${location.search}${location.hash}`;
  return <RenderErrorBoundary resetKey={resetKey}>{children}</RenderErrorBoundary>;
}
