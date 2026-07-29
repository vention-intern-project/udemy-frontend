import { useEffect, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

import type { EnrollmentStatus } from '@entities/enrollment';
import { learningFailure, useLearningList } from '@features/learning-progress';
import {
  Button,
  ContextualNavigationLink,
  Notice,
  Pagination,
  Skeleton,
  SkeletonGroup,
} from '@shared/ui/primitives';

import emptyStateIllustration from './assets/my-learning-empty-state.png';
import styles from './LearningListPage.module.css';

function parsePage(value: string | null): number {
  return value !== null && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value))
    ? Number(value)
    : 1;
}

function enrollmentStatusLabel(status: EnrollmentStatus): string {
  if (status === 'active') return 'Active';
  if (status === 'cancelled') return 'Cancelled';
  return 'Payment pending';
}

export function LearningListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePage(searchParams.get('page'));
  const { enrollments, retry } = useLearningList(page);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const retryRef = useRef(false);
  const requestedPageFocusRef = useRef<number | null>(null);
  const observedPageRef = useRef(page);
  useEffect(() => {
    if (retryRef.current && enrollments.isSuccess) {
      retryRef.current = false;
      headingRef.current?.focus();
    }
    const requestedPage = requestedPageFocusRef.current;
    const previousPage = observedPageRef.current;
    observedPageRef.current = page;
    if (requestedPage !== null && previousPage === requestedPage && page !== requestedPage) {
      requestedPageFocusRef.current = null;
      return;
    }
    if (
      requestedPage !== null &&
      enrollments.isSuccess &&
      page === requestedPage &&
      enrollments.data?.page === requestedPage
    ) {
      requestedPageFocusRef.current = null;
      headingRef.current?.focus();
    }
  }, [enrollments.data?.page, enrollments.isSuccess, page]);
  const changePage = (nextPage: number) => {
    requestedPageFocusRef.current = nextPage;
    setSearchParams(nextPage === 1 ? {} : { page: String(nextPage) });
  };
  if (enrollments.isPending) {
    return (
      <article className={styles.page}>
        <header className={styles.pageHeader}>
          <h1 tabIndex={-1} ref={headingRef}>
            My learning
          </h1>
        </header>
        <SkeletonGroup className={styles.loading} label="Loading your learning">
          <Skeleton height="40px" width="45%" />
          <Skeleton height="120px" width="100%" shape="rect" />
        </SkeletonGroup>
      </article>
    );
  }
  if (enrollments.isError) {
    const failure = learningFailure(enrollments.error);
    return (
      <article className={styles.state}>
        <h1 tabIndex={-1} ref={headingRef}>
          My learning
        </h1>
        <Notice tone="error" title={failure.title}>
          {failure.message}
        </Notice>
        <Button
          onClick={() => {
            retryRef.current = true;
            void retry();
          }}
        >
          Try again
        </Button>
      </article>
    );
  }
  const result = enrollments.data;
  if (result.items.length === 0) {
    return (
      <article className={styles.page}>
        <header className={styles.pageHeader}>
          <h1 tabIndex={-1} ref={headingRef}>
            My learning
          </h1>
        </header>
        <section className={styles.emptyState} aria-labelledby="learning-empty-heading">
          <img
            className={styles.emptyIllustration}
            src={emptyStateIllustration}
            alt=""
            aria-hidden="true"
          />
          <div className={styles.emptyContent}>
            <h2 id="learning-empty-heading">Start your learning journey</h2>
            <p>
              You haven’t enrolled in any courses yet. Browse the catalog and choose your first
              course.
            </p>
            <Link className={styles.primaryAction} to="/">
              Browse courses
            </Link>
          </div>
        </section>
      </article>
    );
  }
  return (
    <article className={styles.page}>
      <header className={styles.pageHeader}>
        <ContextualNavigationLink className={styles.backLink} to="/">
          <ChevronLeft size={18} aria-hidden="true" />
          <span>Browse courses</span>
        </ContextualNavigationLink>
        <div className={styles.headingContent}>
          <h1 tabIndex={-1} ref={headingRef}>
            My learning
          </h1>
          <p className={styles.summary} aria-live="polite">
            {result.total} enrollment{result.total === 1 ? '' : 's'} · Page {result.page} of{' '}
            {Math.max(1, result.pages)}
          </p>
        </div>
      </header>
      <ol className={styles.list}>
        {result.items.map((enrollment) => (
          <li key={enrollment.id} className={styles.card}>
            <div className={styles.cardContent}>
              <h2>{enrollment.course.title}</h2>
              <p className={`${styles.status} ${styles[`status${enrollment.status}`]}`}>
                {enrollmentStatusLabel(enrollment.status)}
              </p>
              {enrollment.course.description !== null ? (
                <p className={styles.description}>{enrollment.course.description}</p>
              ) : null}
            </div>
            <Link className={styles.workspaceAction} to={`/learning/enrollments/${enrollment.id}`}>
              Open learning workspace
            </Link>
          </li>
        ))}
      </ol>
      {result.pages > 1 ? (
        <Pagination
          currentPage={result.page}
          totalPages={result.pages}
          hasNext={result.hasNext}
          hasPrevious={result.hasPrevious}
          onPageChange={changePage}
          label="Learning enrollments pagination"
        />
      ) : null}
    </article>
  );
}
