import { describe, expect, it } from 'vitest';

import { classifyCoursePrice } from '../../../src/features/course-detail';
import {
  admitCartComposite,
  createCartCompositeSnapshot,
  type CartCompositeSnapshotInput,
} from '../../../src/features/checkout-cart';

const paidCourse: CartCompositeSnapshotInput = { courseId: 7, price: '19.99' };
const freeCourse: CartCompositeSnapshotInput = { courseId: 8, price: '0.00' };

describe('Course Detail price classification reused by Cart composite', () => {
  it.each([
    ['0', 'free'],
    ['0.00', 'free'],
    ['19.99', 'paid'],
    ['1.0', 'paid'],
    ['-1', 'invalid'],
    ['invalid', 'invalid'],
  ] as const)('classifies %s as %s', (price, expected) => {
    expect(classifyCoursePrice(price)).toBe(expected);
  });
});

describe('Cart composite snapshot', () => {
  it('defaults a paid course with no selection to a successful outcome', () => {
    expect(createCartCompositeSnapshot([paidCourse])).toEqual({
      kind: 'ready',
      courses: [{ courseId: 7, priceKind: 'paid', outcome: 'success' }],
    });
  });

  it('defaults only paid courses to success and accepts a named paid failure outcome', () => {
    const snapshot = createCartCompositeSnapshot(
      [paidCourse, freeCourse],
      [{ courseId: 7, outcome: 'failed' }],
    );

    expect(snapshot).toEqual({
      kind: 'ready',
      courses: [
        { courseId: 7, priceKind: 'paid', outcome: 'failed' },
        { courseId: 8, priceKind: 'free' },
      ],
    });
  });

  it.each([
    { name: 'empty Cart', courses: [], outcomes: [] },
    { name: 'duplicate course', courses: [paidCourse, paidCourse], outcomes: [] },
    { name: 'invalid price', courses: [{ courseId: 7, price: '-1' }], outcomes: [] },
    {
      name: 'free outcome override',
      courses: [freeCourse],
      outcomes: [{ courseId: 8, outcome: 'failed' }],
    },
    {
      name: 'outcome for a course outside the snapshot',
      courses: [paidCourse],
      outcomes: [{ courseId: 99, outcome: 'failed' }],
    },
    {
      name: 'duplicate selected outcome',
      courses: [paidCourse],
      outcomes: [
        { courseId: 7, outcome: 'success' },
        { courseId: 7, outcome: 'failed' },
      ],
    },
  ] as const)('rejects $name without creating a completion plan', ({ courses, outcomes }) => {
    expect(createCartCompositeSnapshot(courses, outcomes)).toMatchObject({
      kind: 'invalid_snapshot',
      completionPlan: [],
    });
  });
});

describe('Cart composite dual-source admission', () => {
  it('admits only a safely associated whole snapshot and maps completions only for paid pending enrollment', () => {
    const snapshot = createCartCompositeSnapshot(
      [paidCourse, freeCourse],
      [{ courseId: 7, outcome: 'failed' }],
    );
    if (snapshot.kind !== 'ready') throw new Error('Expected ready snapshot');

    expect(
      admitCartComposite({
        snapshot,
        association: 'current',
        enrollmentItems: [
          { id: 70, courseId: 7, status: 'pending_payment' },
          { id: 80, courseId: 8, status: 'active' },
        ],
        freshCartCourseIds: [],
      }),
    ).toEqual({
      kind: 'admitted',
      completionPlan: [{ enrollmentId: 70, courseId: 7, outcome: 'failed' }],
    });
  });

  it.each([
    {
      name: 'retained Cart course',
      enrollmentItems: [{ id: 70, courseId: 7, status: 'pending_payment' }],
      freshCartCourseIds: [7],
      association: 'current',
    },
    {
      name: 'missing free enrollment',
      enrollmentItems: [{ id: 70, courseId: 7, status: 'pending_payment' }],
      freshCartCourseIds: [],
      association: 'current',
    },
    {
      name: 'paid/free status mismatch',
      enrollmentItems: [
        { id: 70, courseId: 7, status: 'active' },
        { id: 80, courseId: 8, status: 'active' },
      ],
      freshCartCourseIds: [],
      association: 'current',
    },
    {
      name: 'ambiguous duplicate course enrollment',
      enrollmentItems: [
        { id: 70, courseId: 7, status: 'pending_payment' },
        { id: 71, courseId: 7, status: 'pending_payment' },
        { id: 80, courseId: 8, status: 'active' },
      ],
      freshCartCourseIds: [],
      association: 'current',
    },
    {
      name: 'unique unexplained pending enrollment outside the client snapshot',
      enrollmentItems: [
        { id: 70, courseId: 7, status: 'pending_payment' },
        { id: 80, courseId: 8, status: 'active' },
        { id: 90, courseId: 9, status: 'pending_payment' },
      ],
      freshCartCourseIds: [],
      association: 'current',
    },
    {
      name: 'stale attempt association',
      enrollmentItems: [
        { id: 70, courseId: 7, status: 'pending_payment' },
        { id: 80, courseId: 8, status: 'active' },
      ],
      freshCartCourseIds: [],
      association: 'stale',
    },
  ] as const)('fails closed for $name with no completion plan', (input) => {
    const snapshot = createCartCompositeSnapshot([paidCourse, freeCourse]);
    if (snapshot.kind !== 'ready') throw new Error('Expected ready snapshot');

    expect(admitCartComposite({ snapshot, ...input })).toEqual({
      kind: 'checkout_integrity_unknown',
      completionPlan: [],
    });
  });
});
