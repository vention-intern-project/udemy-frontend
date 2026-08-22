import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { requestCourseEnrollments } from '@features/instructor-courses';
import type { EnrollmentStatusDto } from '@entities/enrollment';
import { useSession } from '@features/auth-session';
import {
  Button,
  ContextualNavigationLink,
  Notice,
  Pagination,
  Skeleton,
  SkeletonGroup,
} from '@shared/ui/primitives';
import { ApiError } from '@shared/api';
import styles from './InstructorCourseEnrollmentsPage.module.css';

function positiveSafeInteger(value: string | null | undefined): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) ? numeric : null;
}
function pageFrom(value: string | null): number {
  return positiveSafeInteger(value) ?? 1;
}
function failure(error: unknown, t: TFunction): string {
  if (error instanceof ApiError && error.status === 403)
    return t('instructor:courseEnrollmentsYouDoNotHavePermissionToViewTheseEnrollments');
  if (error instanceof ApiError && error.status === 404)
    return t('instructor:courseEnrollmentsThisCourseWasNotFound');
  return t('instructor:courseEnrollmentsWeCouldNotLoadCourseEnrollmentsTryAgain');
}

function InstructorCoursesReturnLink() {
  const { t } = useTranslation();
  return (
    <nav className={styles.breadcrumb} aria-label={t('a11y:breadcrumb')}>
      <ContextualNavigationLink className={styles.breadcrumbLink} to="/instructor/courses">
        <ChevronLeft size={20} aria-hidden="true" />
        <span>{t('navigation:instructorCourses')}</span>
      </ContextualNavigationLink>
      <span className={styles.breadcrumbCurrent} aria-hidden="true">
        /
      </span>
      <span className={styles.breadcrumbCurrent} aria-current="page">
        {t('routes:courseEnrollmentsTitle')}
      </span>
    </nav>
  );
}
function enrollmentStatusLabel(status: EnrollmentStatusDto, t: TFunction): string {
  switch (status) {
    case 'active':
      return t('learning:active');
    case 'cancelled':
      return t('learning:cancelled');
    case 'pending_payment':
      return t('learning:paymentPending');
  }
}
export function InstructorCourseEnrollmentsPage() {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const [params, setParams] = useSearchParams();
  const session = useSession();
  const heading = useRef<HTMLHeadingElement>(null);
  const id = positiveSafeInteger(courseId);
  const page = pageFrom(params.get('page'));
  const roster = useQuery({
    queryKey: ['instructor-course-enrollments', session.cacheEpoch ?? null, id, page],
    queryFn: ({ signal }) => requestCourseEnrollments(session, id as number, page, signal),
    enabled: id !== null,
  });
  useEffect(() => {
    if (roster.isSuccess) heading.current?.focus();
  }, [roster.isSuccess, page]);
  if (id === null)
    return (
      <article className={styles.page}>
        <InstructorCoursesReturnLink />
        <h1>{t('routes:courseEnrollmentsTitle')}</h1>
        <Notice tone="error">{t('instructor:courseEnrollmentsThisCourseWasNotFound')}</Notice>
      </article>
    );
  if (roster.isPending)
    return (
      <article className={styles.page}>
        <InstructorCoursesReturnLink />
        <h1 ref={heading} tabIndex={-1}>
          {t('routes:courseEnrollmentsTitle')}
        </h1>
        <SkeletonGroup label={t('instructor:courseEnrollmentsLoadingCourseEnrollments')}>
          <Skeleton width="100%" height="120px" shape="rect" />
        </SkeletonGroup>
      </article>
    );
  if (roster.isError)
    return (
      <article className={styles.page}>
        <InstructorCoursesReturnLink />
        <h1 ref={heading} tabIndex={-1}>
          {t('routes:courseEnrollmentsTitle')}
        </h1>
        <Notice tone="error">
          <p>{failure(roster.error, t)}</p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              void roster.refetch();
            }}
          >
            {t('routes:tryAgain')}
          </Button>
        </Notice>
      </article>
    );
  const result = roster.data;
  return (
    <article className={styles.page}>
      <InstructorCoursesReturnLink />
      <header>
        <h1 ref={heading} tabIndex={-1}>
          {t('routes:courseEnrollmentsTitle')}
        </h1>
        <p>{t('instructor:courseEnrollmentsCount', { count: result.total })}</p>
      </header>
      {result.items.length === 0 ? (
        <Notice tone="info">{t('instructor:courseEnrollmentsNoEnrollmentsYet')}</Notice>
      ) : (
        <ul className={styles.list}>
          {result.items.map((entry) => (
            <li key={entry.id}>
              <strong>{`${entry.student.name} ${entry.student.surname}`}</strong>
              <span>{entry.student.email}</span>
              <span>{enrollmentStatusLabel(entry.status, t)}</span>
            </li>
          ))}
        </ul>
      )}
      {result.pages > 1 ? (
        <Pagination
          currentPage={result.page}
          totalPages={result.pages}
          hasNext={result.hasNext}
          hasPrevious={result.hasPrevious}
          onPageChange={(next) => setParams(next === 1 ? {} : { page: String(next) })}
          label={t('instructor:courseEnrollmentsCourseEnrollmentsPagination')}
        />
      ) : null}
    </article>
  );
}
