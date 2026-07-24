import { describe, expect, it } from 'vitest';
import { matchPath } from 'react-router-dom';

import {
  APP_ROUTE_BY_ID, APP_ROUTES, densityForPath, homeForRole, routeForPath,
} from '../../src/app/router';

describe('application route registry', () => {
  it('matches every audited PAGE-to-path/access/layout row and excludes PAGE-014', () => {
    expect(APP_ROUTES.map(({ id, path, access, layout }) => ({ id, path, access, layout }))).toEqual([
      { id: 'PAGE-001', path: '/', access: 'public', layout: 'public' },
      { id: 'PAGE-002', path: '/courses/:courseId', access: 'public', layout: 'public' },
      { id: 'PAGE-003', path: '/signup', access: 'guest', layout: 'auth' },
      { id: 'PAGE-004', path: '/login', access: 'guest', layout: 'auth' },
      { id: 'PAGE-005', path: '/forgot-password', access: 'guest', layout: 'auth' },
      { id: 'PAGE-006', path: '/reset-password', access: 'guest', layout: 'auth' },
      { id: 'PAGE-007', path: '/cart', access: 'student', layout: 'workspace' },
      { id: 'PAGE-008', path: '/learning', access: 'student', layout: 'workspace' },
      { id: 'PAGE-009', path: '/learning/enrollments/:enrollmentId', access: 'student', layout: 'workspace' },
      { id: 'PAGE-010', path: '/instructor/courses', access: 'instructor', layout: 'workspace' },
      { id: 'PAGE-011', path: '/instructor/courses/:courseId/edit', access: 'instructor', layout: 'workspace' },
      { id: 'PAGE-012', path: '/instructor/courses/:courseId/enrollments', access: 'instructor', layout: 'workspace' },
      { id: 'PAGE-013', path: '/instructor/lessons/:lessonId/edit', access: 'instructor', layout: 'workspace' },
    ]);
    expect(new Set(APP_ROUTES.map((route) => route.path)).size).toBe(13);
    expect(APP_ROUTES.map((route) => String(route.path))).not.toContain('/admin');
    expect(Object.keys(APP_ROUTE_BY_ID)).toHaveLength(13);
    expect('PAGE-014' in APP_ROUTE_BY_ID).toBe(false);
  });

  it('uses role-correct homes without inventing an admin workspace', () => {
    expect(homeForRole('student')).toBe('/learning');
    expect(homeForRole('instructor')).toBe('/instructor/courses');
    expect(homeForRole('admin')).toBe('/');
  });

  it('derives density from the matched route metadata', () => {
    expect(routeForPath('/courses/course-42')?.id).toBe('PAGE-002');
    expect(routeForPath('/instructor/courses/course-42/edit')?.id).toBe('PAGE-011');
    expect(densityForPath('/')).toBe('marketplace');
    expect(densityForPath('/login')).toBe('marketplace');
    expect(densityForPath('/learning')).toBe('workspace');
    expect(densityForPath('/instructor/courses/course-42/enrollments')).toBe('workspace');
    expect(densityForPath('/unknown')).toBe('marketplace');
  });

  it.each([
    ['/LOGIN', 'PAGE-004'],
    ['/login/', 'PAGE-004'],
    ['/Learning/', 'PAGE-008'],
    ['/instructor/COURSES', 'PAGE-010'],
    ['/instructor/courses/ABC/edit/', 'PAGE-011'],
    ['/instructor/courses/a%2Fb/enrollments', 'PAGE-012'],
  ] as const)('matches installed Router semantics for %s', (pathname, expectedId) => {
    expect(routeForPath(pathname)?.id).toBe(expectedId);
  });

  it.each([
    '/login/help',
    '/learning/enrollments/42/extra',
    '/instructor/courses/42',
  ])('keeps exact-ended nonmatches for %s', (pathname) => {
    expect(routeForPath(pathname)).toBeUndefined();
  });

  it('uses React Router semantics for canonical, case, trailing-slash, and parameter variants', () => {
    for (const route of APP_ROUTES) {
      const canonical = route.path.replace(/:[^/]+/g, 'Example-42');
      const variants = canonical === '/'
        ? ['/']
        : [canonical, canonical.toUpperCase(), `${canonical}/`, `${canonical}//`];

      for (const pathname of variants) {
        expect(matchPath({ path: route.path, end: true }, pathname), `${route.id}: ${pathname}`)
          .not.toBe(null);
        expect(routeForPath(pathname)?.id, pathname).toBe(route.id);
      }
    }

    expect(routeForPath('/learning/enrollments/42/extra')).toBeUndefined();
    expect(routeForPath('/instructor/courses//edit')).toBeUndefined();
  });
});
