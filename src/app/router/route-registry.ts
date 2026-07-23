import { matchPath } from 'react-router-dom';

import type { UserRole } from '../../entities/user';
import type { DensityMode } from '../../shared/ui/theme';

export type PageId =
  | 'PAGE-001' | 'PAGE-002' | 'PAGE-003' | 'PAGE-004' | 'PAGE-005' | 'PAGE-006'
  | 'PAGE-007' | 'PAGE-008' | 'PAGE-009' | 'PAGE-010' | 'PAGE-011' | 'PAGE-012'
  | 'PAGE-013';

export type RouteAccess = 'public' | 'guest' | Extract<UserRole, 'student' | 'instructor'>;
export type RouteLayout = 'public' | 'auth' | 'workspace';

export interface AppRouteDefinition {
  id: PageId;
  path: string;
  title: string;
  description: string;
  access: RouteAccess;
  layout: RouteLayout;
}

export const APP_ROUTES = [
  { id: 'PAGE-001', path: '/', title: 'Course catalog', description: 'Browse and discover available courses.', access: 'public', layout: 'public' },
  { id: 'PAGE-002', path: '/courses/:courseId', title: 'Course details', description: 'Review course information and lessons.', access: 'public', layout: 'public' },
  { id: 'PAGE-003', path: '/signup', title: 'Create account', description: 'Create a LearnHub account to start learning or teaching.', access: 'guest', layout: 'auth' },
  { id: 'PAGE-004', path: '/login', title: 'Log in', description: 'Access your learning or instructor workspace.', access: 'guest', layout: 'auth' },
  { id: 'PAGE-005', path: '/forgot-password', title: 'Forgot password', description: 'Request help signing back in to your account.', access: 'guest', layout: 'auth' },
  { id: 'PAGE-006', path: '/reset-password', title: 'Reset password', description: 'Choose a new password for your account.', access: 'guest', layout: 'auth' },
  { id: 'PAGE-007', path: '/cart', title: 'Cart', description: 'Your selected courses will appear here.', access: 'student', layout: 'workspace' },
  { id: 'PAGE-008', path: '/learning', title: 'My learning', description: 'Your course enrollments will appear here.', access: 'student', layout: 'workspace' },
  { id: 'PAGE-009', path: '/learning/enrollments/:enrollmentId', title: 'Learning details', description: 'Course progress and lessons will appear here.', access: 'student', layout: 'workspace' },
  { id: 'PAGE-010', path: '/instructor/courses', title: 'Instructor courses', description: 'Your authored courses will appear here.', access: 'instructor', layout: 'workspace' },
  { id: 'PAGE-011', path: '/instructor/courses/:courseId/edit', title: 'Edit course', description: 'Course and lesson editing will appear here.', access: 'instructor', layout: 'workspace' },
  { id: 'PAGE-012', path: '/instructor/courses/:courseId/enrollments', title: 'Course enrollments', description: 'The selected course roster will appear here.', access: 'instructor', layout: 'workspace' },
  { id: 'PAGE-013', path: '/instructor/lessons/:lessonId/edit', title: 'Edit lesson', description: 'Lesson metadata and upload tools will appear here.', access: 'instructor', layout: 'workspace' },
] as const satisfies readonly AppRouteDefinition[];

export const APP_ROUTE_BY_ID = Object.freeze(Object.fromEntries(
  APP_ROUTES.map((route) => [route.id, route]),
)) as Readonly<Record<PageId, (typeof APP_ROUTES)[number]>>;

export function routeForPath(pathname: string): AppRouteDefinition | undefined {
  return APP_ROUTES.find((route) => matchPath({
    path: route.path,
    end: true,
  }, pathname));
}

export function densityForPath(pathname: string): DensityMode {
  return routeForPath(pathname)?.layout === 'workspace' ? 'workspace' : 'marketplace';
}

export function homeForRole(role: UserRole): string {
  if (role === 'student') return APP_ROUTE_BY_ID['PAGE-008'].path;
  if (role === 'instructor') return APP_ROUTE_BY_ID['PAGE-010'].path;
  return APP_ROUTE_BY_ID['PAGE-001'].path;
}
