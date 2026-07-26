import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import type { EnrollmentStatus } from '@entities/enrollment';
import { learningFailure, useLearningList } from '@features/learning-progress';
import { Button, Notice, Pagination, Skeleton, SkeletonGroup } from '@shared/ui/primitives';

import styles from './LearningListPage.module.css';

function parsePage(value: string | null): number {
  return value !== null && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : 1;
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
    if (retryRef.current && enrollments.isSuccess) { retryRef.current = false; headingRef.current?.focus(); }
    const requestedPage = requestedPageFocusRef.current;
    const previousPage = observedPageRef.current;
    observedPageRef.current = page;
    if (requestedPage !== null && previousPage === requestedPage && page !== requestedPage) {
      requestedPageFocusRef.current = null;
      return;
    }
    if (requestedPage !== null && enrollments.isSuccess && page === requestedPage && enrollments.data?.page === requestedPage) {
      requestedPageFocusRef.current = null;
      headingRef.current?.focus();
    }
  }, [enrollments.data?.page, enrollments.isSuccess, page]);
  const changePage = (nextPage: number) => {
    requestedPageFocusRef.current = nextPage;
    setSearchParams(nextPage === 1 ? {} : { page: String(nextPage) });
  };
  if (enrollments.isPending) return <SkeletonGroup className={styles.loading} label="Loading your learning"><Skeleton height="40px" width="45%" /><Skeleton height="120px" width="100%" shape="rect" /></SkeletonGroup>;
  if (enrollments.isError) {
    const failure = learningFailure(enrollments.error);
    return <section className={styles.state}><h1 tabIndex={-1} ref={headingRef}>My learning</h1><Notice tone="error" title={failure.title}>{failure.message}</Notice><Button onClick={() => { retryRef.current = true; void retry(); }}>Try again</Button></section>;
  }
  const result = enrollments.data;
  if (result.items.length === 0) return <section className={styles.state}><h1 tabIndex={-1} ref={headingRef}>My learning</h1><h2>Your learning is empty</h2><p>Enroll in a course to see it here.</p><Link to="/">Browse courses</Link></section>;
  return (
    <article className={styles.page}>
      <header><h1 tabIndex={-1} ref={headingRef}>My learning</h1><p aria-live="polite">{result.total} enrollment{result.total === 1 ? '' : 's'} · Page {result.page} of {Math.max(1, result.pages)}</p></header>
      <ol className={styles.list}>{result.items.map((enrollment) => <li key={enrollment.id} className={styles.card}>
        <div><p className={`${styles.status} ${styles[`status${enrollment.status}`]}`}>{enrollmentStatusLabel(enrollment.status)}</p><h2>{enrollment.course.title}</h2><p>{enrollment.course.description ?? 'No course description is available.'}</p></div>
        <Link to={`/learning/enrollments/${enrollment.id}`}>Open learning workspace</Link>
      </li>)}</ol>
      {result.pages > 1 ? <Pagination currentPage={result.page} totalPages={result.pages} hasNext={result.hasNext} hasPrevious={result.hasPrevious} onPageChange={changePage} label="Learning enrollments pagination" /> : null}
    </article>
  );
}
