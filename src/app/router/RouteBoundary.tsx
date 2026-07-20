import { Navigate, useLocation } from 'react-router-dom';

import { useSession, sanitizeInternalReturnTo } from '../../features/auth-session';
import type { AppRouteDefinition } from './route-registry';
import { homeForRole } from './route-registry';
import { ForbiddenState } from './RouteStates';

export function RouteBoundary({
  route,
  children,
}: {
  route: AppRouteDefinition;
  children: React.ReactNode;
}) {
  const { state } = useSession();
  const location = useLocation();

  if (route.access === 'public') return children;

  if (route.access === 'guest') {
    return state.status === 'authenticated'
      ? <Navigate replace to={homeForRole(state.user.role)} />
      : children;
  }

  if (state.status !== 'authenticated') {
    const intended = sanitizeInternalReturnTo(
      `${location.pathname}${location.search}${location.hash}`,
      globalThis.location?.origin,
    ) ?? '/';
    return <Navigate replace to={`/login?returnTo=${encodeURIComponent(intended)}`} />;
  }

  if (state.user.role !== route.access) return <ForbiddenState />;
  return children;
}
