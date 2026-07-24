import { Route, Routes } from 'react-router-dom';

import { useSession } from '../../features/auth-session';
import {
  CatalogPage, ForgotPasswordPage, LoginPage, ResetPasswordPage, SignupPage,
} from '@pages/index';
import { AppShell } from '../layouts/AppShell';
import { PlaceholderPage } from './PlaceholderPage';
import { RouteBoundary } from './RouteBoundary';
import { APP_ROUTES } from './route-registry';
import { BootstrapState, NotFoundState, SessionErrorState } from './RouteStates';

function pageForRoute(route: (typeof APP_ROUTES)[number]) {
  if (route.id === 'PAGE-001') return <CatalogPage />;
  if (route.id === 'PAGE-003') return <SignupPage />;
  if (route.id === 'PAGE-004') return <LoginPage />;
  if (route.id === 'PAGE-005') return <ForgotPasswordPage />;
  if (route.id === 'PAGE-006') return <ResetPasswordPage />;
  return <PlaceholderPage route={route} />;
}

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
                {pageForRoute(route)}
              </RouteBoundary>
            )}
          />
        ))}
        <Route path="*" element={<NotFoundState />} />
      </Route>
    </Routes>
  );
}
