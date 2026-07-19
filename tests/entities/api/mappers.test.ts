import { describe, expect, it } from 'vitest';

import { mapCartDto } from '../../../src/entities/cart';
import {
  mapCourseDto,
  mapLessonDto,
  mapLessonTypeDto,
  type LessonType,
} from '../../../src/entities/course';
import {
  mapEnrollmentDto,
  mapEnrollmentStatusDto,
  type EnrollmentStatus,
} from '../../../src/entities/enrollment';
import {
  mapUserProfileDto,
  mapUserRoleDto,
  type UserRole,
} from '../../../src/entities/user';

describe('wire DTO to domain mappers', () => {
  it('maps course and lesson snake_case fields while preserving decimals and nullable values', () => {
    expect(mapCourseDto({
      id: 1,
      instructor_id: 2,
      title: 'React',
      description: null,
      price: '9.99',
      currency: 'USD',
      published_at: null,
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-02T00:00:00Z',
    })).toEqual({
      id: 1,
      instructorId: 2,
      title: 'React',
      description: null,
      price: '9.99',
      currency: 'USD',
      publishedAt: null,
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-02T00:00:00Z',
    });

    expect(mapLessonDto({
      id: 3,
      course_id: 1,
      title: 'Types',
      lesson_type: 'pdf',
      download_url: null,
      description: null,
      is_published: false,
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    })).toMatchObject({ courseId: 1, lessonType: 'pdf', downloadUrl: null, isPublished: false });
  });

  it('maps cart totals and nested item fields without numeric coercion', () => {
    const cart = mapCartDto({
      id: 1,
      items: [{
        id: 2,
        course_id: 3,
        added_at: '2026-07-01T00:00:00Z',
        course: { id: 3, title: 'React', price: '29.99', currency: 'USD' },
      }],
      total_price: '29.99',
      currency: 'USD',
      item_count: 1,
    });

    expect(cart.totalPrice).toBe('29.99');
    expect(cart.items[0]).toMatchObject({ courseId: 3, addedAt: '2026-07-01T00:00:00Z' });
    expect(cart.items[0].course.price).toBe('29.99');
  });

  it('maps enrollment status and user profile nullable fields', () => {
    expect(mapEnrollmentDto({
      id: 1,
      user_id: 2,
      course_id: 3,
      status: 'pending_payment',
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
      course: { id: 3, title: 'React', description: null, price: '10.00', currency: 'USD' },
    })).toMatchObject({ userId: 2, courseId: 3, status: 'pending_payment' });

    expect(mapUserProfileDto({
      email: 'learner@example.test',
      name: 'Ada',
      surname: 'Lovelace',
      role: 'student',
      birthday: null,
      phone_number: null,
      created_at: '2026-07-01T00:00:00Z',
    })).toMatchObject({ phoneNumber: null, createdAt: '2026-07-01T00:00:00Z' });
  });

  it('maps every wire enum value to its independently owned domain value', () => {
    const lessonTypes: readonly LessonType[] = ['video', 'text', 'pdf'];
    const enrollmentStatuses: readonly EnrollmentStatus[] = ['pending_payment', 'active'];
    const userRoles: readonly UserRole[] = ['student', 'instructor', 'admin'];

    expect(lessonTypes.map(mapLessonTypeDto)).toEqual(lessonTypes);
    expect(enrollmentStatuses.map(mapEnrollmentStatusDto)).toEqual(enrollmentStatuses);
    expect(userRoles.map(mapUserRoleDto)).toEqual(userRoles);
  });

  it('rejects unknown runtime enum values deterministically', () => {
    expect(() => mapLessonTypeDto('audio')).toThrow('Unsupported lesson type: audio');
    expect(() => mapEnrollmentStatusDto('cancelled')).toThrow('Unsupported enrollment status: cancelled');
    expect(() => mapUserRoleDto('owner')).toThrow('Unsupported user role: owner');
  });
});
