import { Route, Routes } from 'react-router-dom';

import { useSession } from '../../features/auth-session';
import { AppShell } from '../layouts/AppShell';
import { PlaceholderPage } from './PlaceholderPage';
import { RouteBoundary } from './RouteBoundary';
import { APP_ROUTES } from './route-registry';
import { BootstrapState, NotFoundState, SessionErrorState } from './RouteStates';

export function AppRouter() {
  const { state, retryBootstrap } = useSession();

  if (state.status === 'bootstrapping') return <BootstrapState />;
  if (state.status === 'error') {
    return <SessionErrorState onRetry={retryBootstrap} />;
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        {APP_ROUTES.map((route) => (
          <Route
            key={route.id}
            path={route.path}
            element={(
              <RouteBoundary route={route}>
                <PlaceholderPage route={route} />
              </RouteBoundary>
            )}
          />
        ))}
        <Route path="*" element={<NotFoundState />} />
      </Route>
    </Routes>
  );
}
