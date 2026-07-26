import { queryKeys } from '@entities/api';

export function learningListQueryKey(subject: string, page: number) {
  return queryKeys.private.operation(subject, 'API-021', `learning:list:${page}`);
}

export function learningDetailQueryKey(subject: string, enrollmentId: number) {
  return queryKeys.private.operation(subject, 'API-022', `learning:enrollment:${enrollmentId}`);
}

export function learningCourseProgressQueryKey(subject: string, courseId: number) {
  return queryKeys.private.operation(subject, 'API-019', `learning:course:${courseId}:progress`);
}

export function learningOutlineQueryKey(subject: string, courseId: number) {
  return queryKeys.private.operation(subject, 'API-014', `learning:course:${courseId}:outline`);
}
