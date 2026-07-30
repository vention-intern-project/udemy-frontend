import { Route, Routes } from 'react-router-dom';

import { useSession } from '../../features/auth-session';
import {
  AiChatPage,
  CartPage,
  CatalogPage,
  CourseDetailPage,
  ForgotPasswordPage,
  LearningDetailPage,
  LearningListPage,
  InstructorCoursesPage,
  InstructorCourseEnrollmentsPage,
  LoginPage,
  ResetPasswordPage,
  SignupPage,
} from '@pages/index';
import { AppShell } from '../layouts/AppShell';
import { PlaceholderPage } from './PlaceholderPage';
import { RouteBoundary } from './RouteBoundary';
import { APP_ROUTES, type AppRouteDefinition } from './route-registry';
import { BootstrapState, NotFoundState, SessionErrorState } from './RouteStates';

function pageForRoute(route: AppRouteDefinition) {
  if (route.id === 'PAGE-001') return <CatalogPage />;
  if (route.id === 'PAGE-002') return <CourseDetailPage />;
  if (route.id === 'PAGE-003') return <SignupPage />;
  if (route.id === 'PAGE-004') return <LoginPage />;
  if (route.id === 'PAGE-005') return <ForgotPasswordPage />;
  if (route.id === 'PAGE-006') return <ResetPasswordPage />;
  if (route.id === 'PAGE-007') return <CartPage />;
  if (route.id === 'PAGE-008') return <LearningListPage />;
  if (route.id === 'PAGE-009') return <LearningDetailPage />;
  if (route.id === 'PAGE-010') return <InstructorCoursesPage />;
  if (route.id === 'PAGE-012') return <InstructorCourseEnrollmentsPage />;
  if (route.id === 'PAGE-014' || route.id === 'PAGE-015') return <AiChatPage />;
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
            element={<RouteBoundary route={route}>{pageForRoute(route)}</RouteBoundary>}
          />
        ))}
        <Route path="*" element={<NotFoundState />} />
      </Route>
    </Routes>
  );
}
