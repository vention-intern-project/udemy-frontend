import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, type RefObject } from 'react';

import { queryKeys } from '@entities/api';
import { useSession } from '@features/auth-session';

import { requestCourseRatingSummary } from './api';

const COURSE_RATING_SUMMARY_STALE_TIME = 60_000;
const COURSE_RATING_SUMMARY_ROOT_MARGIN = '320px';

export function courseRatingSummaryQueryKey(courseId: number) {
  return queryKeys.public.operation('API-037', `course:${courseId}:reviews:summary`);
}

function supportsIntersectionObserver(): boolean {
  return typeof window !== 'undefined' && typeof window.IntersectionObserver === 'function';
}

export function useCourseRatingSummary(courseId: number, elementRef: RefObject<HTMLElement>) {
  const session = useSession();
  const [isNearViewport, setIsNearViewport] = useState(!supportsIntersectionObserver);

  useEffect(() => {
    if (!supportsIntersectionObserver()) {
      setIsNearViewport(true);
      return undefined;
    }
    const element = elementRef.current;
    if (!element) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setIsNearViewport(true);
        observer.disconnect();
      },
      { rootMargin: COURSE_RATING_SUMMARY_ROOT_MARGIN },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [elementRef]);

  return useQuery({
    queryKey: courseRatingSummaryQueryKey(courseId),
    queryFn: ({ signal }) => requestCourseRatingSummary(session, courseId, signal),
    enabled: isNearViewport,
    staleTime: COURSE_RATING_SUMMARY_STALE_TIME,
  });
}
