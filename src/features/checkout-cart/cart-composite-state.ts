import type { MockPaymentStatusDto } from '@entities/cart';
import type { EnrollmentStatus } from '@entities/enrollment';
import { classifyCoursePrice, type CoursePriceKind } from '@features/course-detail';

export interface CartCompositeSnapshotInput {
  readonly courseId: number;
  readonly price: string;
}

export interface CartCompositeOutcomeSelection {
  readonly courseId: number;
  readonly outcome: MockPaymentStatusDto;
}

export interface CartCompositePaidCourse {
  readonly courseId: number;
  readonly priceKind: 'paid';
  readonly outcome: MockPaymentStatusDto;
}

export interface CartCompositeFreeCourse {
  readonly courseId: number;
  readonly priceKind: 'free';
}

export type CartCompositeSnapshotCourse = CartCompositePaidCourse | CartCompositeFreeCourse;

export interface ReadyCartCompositeSnapshot {
  readonly kind: 'ready';
  readonly courses: readonly CartCompositeSnapshotCourse[];
}

export interface InvalidCartCompositeSnapshot {
  readonly kind: 'invalid_snapshot';
  readonly completionPlan: readonly [];
}

export type CartCompositeSnapshot = ReadyCartCompositeSnapshot | InvalidCartCompositeSnapshot;

export interface CartCompositeEnrollment {
  readonly id: number;
  readonly courseId: number;
  readonly status: EnrollmentStatus;
}

export type CartCompositeAssociation = 'current' | 'stale';

export interface CartCompositeAdmissionInput {
  readonly snapshot: ReadyCartCompositeSnapshot;
  readonly association: CartCompositeAssociation;
  readonly enrollmentItems: readonly CartCompositeEnrollment[];
  readonly freshCartCourseIds: readonly number[];
  readonly discoveredEnrollmentIdentities?: readonly CartCompositeEnrollmentIdentity[];
}

export interface CartCompositeCompletionPlanItem {
  readonly enrollmentId: number;
  readonly courseId: number;
  readonly outcome: MockPaymentStatusDto;
}

export interface CartCompositeEnrollmentIdentity {
  readonly enrollmentId: number;
  readonly courseId: number;
}

export interface CartCompositeRecoveryContinuityInput {
  readonly discoveredEnrollmentIdentities: readonly CartCompositeEnrollmentIdentity[];
  readonly completionPlan: readonly CartCompositeCompletionPlanItem[];
}

export interface AdmittedCartComposite {
  readonly kind: 'admitted';
  readonly completionPlan: readonly CartCompositeCompletionPlanItem[];
}

export interface CheckoutIntegrityUnknown {
  readonly kind: 'checkout_integrity_unknown';
  readonly completionPlan: readonly [];
}

export type CartCompositeAdmission = AdmittedCartComposite | CheckoutIntegrityUnknown;

function invalidSnapshot(): InvalidCartCompositeSnapshot {
  return { kind: 'invalid_snapshot', completionPlan: [] };
}

function integrityUnknown(): CheckoutIntegrityUnknown {
  return { kind: 'checkout_integrity_unknown', completionPlan: [] };
}

function priceKindFor(course: CartCompositeSnapshotInput): CoursePriceKind {
  return classifyCoursePrice(course.price);
}

export function createCartCompositeSnapshot(
  courses: readonly CartCompositeSnapshotInput[],
  selections: readonly CartCompositeOutcomeSelection[] = [],
): CartCompositeSnapshot {
  if (courses.length === 0) return invalidSnapshot();
  const courseIds = new Set<number>();
  const selectionsByCourseId = new Map<number, MockPaymentStatusDto>();
  for (const selection of selections) {
    if (selectionsByCourseId.has(selection.courseId)) return invalidSnapshot();
    selectionsByCourseId.set(selection.courseId, selection.outcome);
  }

  const snapshotCourses: CartCompositeSnapshotCourse[] = [];
  for (const course of courses) {
    if (courseIds.has(course.courseId)) return invalidSnapshot();
    courseIds.add(course.courseId);
    const priceKind = priceKindFor(course);
    if (priceKind === 'invalid') return invalidSnapshot();
    const selection = selectionsByCourseId.get(course.courseId);
    if (priceKind === 'free') {
      if (selection !== undefined) return invalidSnapshot();
      snapshotCourses.push({ courseId: course.courseId, priceKind });
      continue;
    }
    snapshotCourses.push({
      courseId: course.courseId,
      priceKind,
      outcome: selection ?? 'success',
    });
  }
  if (selections.some((item) => !courseIds.has(item.courseId))) return invalidSnapshot();
  return { kind: 'ready', courses: snapshotCourses };
}

function hasUniqueEnrollmentIdentities(items: readonly CartCompositeEnrollment[]): boolean {
  const enrollmentIds = new Set<number>();
  const courseIds = new Set<number>();
  for (const item of items) {
    if (enrollmentIds.has(item.id) || courseIds.has(item.courseId)) return false;
    enrollmentIds.add(item.id);
    courseIds.add(item.courseId);
  }
  return true;
}

export function hasExactRecoveryContinuity(input: CartCompositeRecoveryContinuityInput): boolean {
  if (input.discoveredEnrollmentIdentities.length !== input.completionPlan.length) return false;
  const discoveredCoursesByEnrollmentId = new Map<number, number>();
  for (const identity of input.discoveredEnrollmentIdentities) {
    if (discoveredCoursesByEnrollmentId.has(identity.enrollmentId)) return false;
    discoveredCoursesByEnrollmentId.set(identity.enrollmentId, identity.courseId);
  }
  const completionEnrollmentIds = new Set<number>();
  for (const item of input.completionPlan) {
    if (completionEnrollmentIds.has(item.enrollmentId)) return false;
    completionEnrollmentIds.add(item.enrollmentId);
    if (discoveredCoursesByEnrollmentId.get(item.enrollmentId) !== item.courseId) return false;
  }
  return true;
}

export function admitCartComposite(input: CartCompositeAdmissionInput): CartCompositeAdmission {
  if (input.association !== 'current' || !hasUniqueEnrollmentIdentities(input.enrollmentItems))
    return integrityUnknown();
  const cartCourseIds = new Set(input.freshCartCourseIds);
  const enrollmentsByCourseId = new Map(
    input.enrollmentItems.map((enrollment) => [enrollment.courseId, enrollment]),
  );
  const snapshotCourseIds = new Set(input.snapshot.courses.map((course) => course.courseId));
  if (
    input.enrollmentItems.some(
      (enrollment) =>
        enrollment.status === 'pending_payment' && !snapshotCourseIds.has(enrollment.courseId),
    )
  )
    return integrityUnknown();
  const completionPlan: CartCompositeCompletionPlanItem[] = [];
  for (const course of input.snapshot.courses) {
    const enrollment = enrollmentsByCourseId.get(course.courseId);
    if (cartCourseIds.has(course.courseId) || enrollment === undefined) return integrityUnknown();
    if (course.priceKind === 'free') {
      if (enrollment.status !== 'active') return integrityUnknown();
      continue;
    }
    if (enrollment.status !== 'pending_payment') return integrityUnknown();
    completionPlan.push({
      enrollmentId: enrollment.id,
      courseId: course.courseId,
      outcome: course.outcome,
    });
  }
  if (
    input.discoveredEnrollmentIdentities !== undefined &&
    !hasExactRecoveryContinuity({
      discoveredEnrollmentIdentities: input.discoveredEnrollmentIdentities,
      completionPlan,
    })
  )
    return integrityUnknown();
  return { kind: 'admitted', completionPlan };
}
