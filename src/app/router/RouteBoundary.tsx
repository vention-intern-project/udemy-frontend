import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useSession, sanitizeInternalReturnTo } from '../../features/auth-session';
import type { AppRouteDefinition } from './route-registry';
import { homeForRole } from './route-registry';
import { ForbiddenState } from './RouteStates';

interface RouteBoundaryProps {
  route: AppRouteDefinition;
  children: ReactNode;
}

export function RouteBoundary({ route, children }: RouteBoundaryProps) {
  const { state } = useSession();
  const location = useLocation();

  if (route.access === 'public') {
    if (
      route.id === 'PAGE-001' &&
      state.status === 'authenticated' &&
      state.user.role === 'instructor'
    ) {
      return <Navigate replace to={homeForRole(state.user.role)} />;
    }
    return children;
  }

  if (route.access === 'guest') {
    if (state.status !== 'authenticated') return children;
    const returnTo = sanitizeInternalReturnTo(
      new URLSearchParams(location.search).get('returnTo'),
      globalThis.location?.origin,
    );
    return <Navigate replace to={returnTo ?? homeForRole(state.user.role)} />;
  }

  if (state.status !== 'authenticated') {
    const intended =
      sanitizeInternalReturnTo(
        `${location.pathname}${location.search}${location.hash}`,
        globalThis.location?.origin,
      ) ?? '/';
    return <Navigate replace to={`/login?returnTo=${encodeURIComponent(intended)}`} />;
  }

  if (state.user.role !== route.access) return <ForbiddenState />;
  return children;
}
