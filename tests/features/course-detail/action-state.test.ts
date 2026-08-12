import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  courseMutationDisposition,
  coursePrimaryAction,
} from '../../../src/features/course-detail';
import type { CourseDetail } from '../../../src/entities/course';
import type { SessionState } from '../../../src/features/auth-session';
import { ApiError } from '../../../src/shared/api';

const publishedCourse: CourseDetail = {
  id: 7,
  instructorId: 2,
  instructorName: 'Ada Lovelace',
  title: 'React',
  description: null,
  price: '0.00',
  currency: 'USD',
  publishedAt: '2026-07-01T00:00:00Z',
  lessons: [],
};

const anonymous: SessionState = { status: 'anonymous' };
const student: SessionState = {
  status: 'authenticated',
  user: {
    email: 'student@example.test',
    name: 'Student',
    surname: 'One',
    role: 'student',
    birthday: null,
    phoneNumber: null,
    createdAt: '2026-01-01T00:00:00Z',
  },
};

describe('course primary action matrix', () => {
  it('carries exact guest guidance, disabled action labels, and a safe internal login target', () => {
    expect(
      coursePrimaryAction({
        course: publishedCourse,
        session: anonymous,
        preflight: 'not-required',
      }),
    ).toEqual({
      kind: 'login',
      helper: { linkText: 'Sign in', guidance: 'to enroll for free.' },
      label: 'Enroll for free',
      to: '/login?returnTo=%2Fcourses%2F7',
    });
    expect(
      coursePrimaryAction({
        course: { ...publishedCourse, price: '9.99' },
        session: anonymous,
        preflight: 'not-required',
      }),
    ).toEqual({
      kind: 'login',
      helper: { linkText: 'Sign in', guidance: 'to add this course to your cart.' },
      label: 'Add to cart',
      to: '/login?returnTo=%2Fcourses%2F7',
    });
  });

  it('selects API-020 for eligible free students and API-005 for eligible paid students', () => {
    expect(
      coursePrimaryAction({ course: publishedCourse, session: student, preflight: 'eligible' }),
    ).toEqual({ kind: 'enroll', label: 'Enroll free' });
    expect(
      coursePrimaryAction({
        course: { ...publishedCourse, price: '9.99' },
        session: student,
        preflight: 'eligible',
      }),
    ).toEqual({ kind: 'cart', label: 'Add to cart' });
  });

  it.each([
    [{ ...publishedCourse, publishedAt: null }, 'Course is not published'],
    [{ ...publishedCourse, price: '-1' }, 'Action unavailable'],
    [{ ...publishedCourse, price: 'invalid' }, 'Action unavailable'],
  ])('fails closed for draft or invalid-price courses', (course, label) => {
    expect(coursePrimaryAction({ course, session: student, preflight: 'eligible' })).toEqual({
      kind: 'disabled',
      label,
    });
  });

  it.each([
    ['already-enrolled', 'Already enrolled'],
    ['already-in-cart', 'Already in cart'],
    ['unavailable', 'Action unavailable'],
  ] as const)('fails closed for %s preflight', (preflight, label) => {
    expect(coursePrimaryAction({ course: publishedCourse, session: student, preflight })).toEqual({
      kind: 'disabled',
      label,
    });
  });
});

describe('course mutation disposition matrix', () => {
  it.each([
    [
      new ApiError({ kind: 'offline', status: null, message: 'offline' }),
      'retryable',
      null,
      'none',
    ],
    [new ApiError({ kind: 'server', status: 500, message: 'server' }), 'retryable', null, 'none'],
    [
      new ApiError({ kind: 'unauthorized', status: 401, message: 'auth' }),
      'terminal',
      'unavailable',
      'none',
    ],
    [
      new ApiError({ kind: 'forbidden', status: 403, message: 'forbidden' }),
      'terminal',
      'unavailable',
      'none',
    ],
    [
      new ApiError({ kind: 'not_found', status: 404, message: 'Course not found' }),
      'terminal',
      'unavailable',
      'detail',
    ],
    [
      new ApiError({ kind: 'bad_request', status: 400, message: 'Course is not published' }),
      'terminal',
      'unavailable',
      'detail',
    ],
    [
      new ApiError({ kind: 'validation', status: 422, message: 'Course is not published' }),
      'terminal',
      'unavailable',
      'none',
    ],
    [
      new ApiError({ kind: 'conflict', status: 409, message: 'Already enrolled in this course' }),
      'terminal',
      'already-enrolled',
      'enrollments',
    ],
    [
      new ApiError({ kind: 'conflict', status: 409, message: 'Course already in cart' }),
      'terminal',
      'already-in-cart',
      'cart',
    ],
    [
      new ApiError({ kind: 'conflict', status: 409, message: 'Unexpected conflict' }),
      'terminal',
      'unavailable',
      'preflight',
    ],
    [
      new ApiError({ kind: 'validation', status: 422, message: 'validation' }),
      'terminal',
      'unavailable',
      'none',
    ],
    [new Error('unexpected'), 'terminal', 'unavailable', 'none'],
  ] as const)(
    'maps accepted outcome %# to a named retryable or terminal disposition',
    (error, kind, preflight, refresh) => {
      expect(courseMutationDisposition(error)).toEqual(
        expect.objectContaining({ kind, preflight, refresh }),
      );
    },
  );

  it('uses existing semantic types instead of mechanical projections', () => {
    const apiSource = readFileSync(
      new URL('../../../src/features/course-detail/api.ts', import.meta.url),
      'utf8',
    );
    const hookSource = readFileSync(
      new URL('../../../src/features/course-detail/useCourseDetail.ts', import.meta.url),
      'utf8',
    );

    expect(apiSource).not.toMatch(
      /LessonOutline\['items'\]\[number\]|EnrollmentList\['items'\]\[number\]/,
    );
    expect(hookSource).not.toMatch(/ReturnType<typeof useSession>\['state'\]/);
  });
});
