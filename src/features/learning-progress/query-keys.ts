import { queryKeys } from '@entities/api';
import type { SessionCacheEpoch } from '@shared/api';

export function learningListQueryKey(subject: SessionCacheEpoch, page: number) {
  return queryKeys.private.operation(subject, 'API-021', `learning:list:${page}`);
}

export function learningDetailQueryKey(subject: SessionCacheEpoch, enrollmentId: number) {
  return queryKeys.private.operation(subject, 'API-022', `learning:enrollment:${enrollmentId}`);
}

export function learningCourseProgressQueryKey(subject: SessionCacheEpoch, courseId: number) {
  return queryKeys.private.operation(subject, 'API-019', `learning:course:${courseId}:progress`);
}

export function learningOutlineQueryKey(subject: SessionCacheEpoch, courseId: number) {
  return queryKeys.private.operation(subject, 'API-014', `learning:course:${courseId}:outline`);
}
