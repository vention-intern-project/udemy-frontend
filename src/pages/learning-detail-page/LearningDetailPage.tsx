import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';

import { learningFailure, useLearningWorkspace } from '@features/learning-progress';
import { EnrollmentProgressPanel } from '@widgets/index';
import { Button, Notice, Skeleton, SkeletonGroup } from '@shared/ui/primitives';

import styles from './LearningDetailPage.module.css';

function parseEnrollmentId(value: string | undefined): number | null {
  return value && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;
}

export function LearningDetailPage() {
  const enrollmentId = parseEnrollmentId(useParams().enrollmentId);
  const workspace = useLearningWorkspace(enrollmentId);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const retryEnrollmentRef = useRef(false);
  const retryWorkspaceRef = useRef(false);
  useEffect(() => {
    if (retryEnrollmentRef.current && workspace.enrollment.isSuccess) { retryEnrollmentRef.current = false; headingRef.current?.focus(); }
  }, [workspace.enrollment.isSuccess]);
  useEffect(() => {
    if (retryWorkspaceRef.current && workspace.progress.isSuccess && workspace.outline.isSuccess) { retryWorkspaceRef.current = false; headingRef.current?.focus(); }
  }, [workspace.outline.isSuccess, workspace.progress.isSuccess]);
  if (enrollmentId === null) return <section className={styles.state}><h1>Learning workspace unavailable</h1><p>This learning workspace is unavailable.</p><Link to="/learning">Return to my learning</Link></section>;
  if (workspace.enrollment.isPending) return <SkeletonGroup className={styles.loading} label="Loading learning workspace"><Skeleton height="40px" width="55%" /><Skeleton height="240px" width="100%" shape="rect" /></SkeletonGroup>;
  if (workspace.enrollment.isError) {
    const failure = learningFailure(workspace.enrollment.error);
    return <section className={styles.state}><h1 tabIndex={-1} ref={headingRef}>{failure.title}</h1><Notice tone="error" title={failure.title}>{failure.message}</Notice><Link to="/learning">Return to my learning</Link>{!failure.unavailable ? <Button onClick={() => { retryEnrollmentRef.current = true; void workspace.retryEnrollment(); }}>Try again</Button> : null}</section>;
  }
  const enrollment = workspace.enrollment.data;
  const available = enrollment.status === 'active';
  const progressFailure = workspace.progress.isError ? learningFailure(workspace.progress.error) : null;
  if (workspace.mutationUnavailable || progressFailure?.unavailable) return <section className={styles.state}><h1 tabIndex={-1} ref={headingRef}>Learning workspace unavailable</h1><Notice tone="error" title="Learning workspace unavailable">This learning workspace is unavailable.</Notice><Link to="/learning">Return to my learning</Link></section>;
  return (
    <article className={styles.page}>
      <Link className={styles.backLink} to="/learning">Back to my learning</Link>
      <header className={styles.header}><p className={`${styles.status} ${styles[`status${enrollment.status}`]}`}>{enrollment.status === 'active' ? 'Active' : enrollment.status === 'cancelled' ? 'Cancelled' : 'Payment pending'}</p><h1 tabIndex={-1} ref={headingRef}>{enrollment.course.title}</h1><p>{enrollment.course.description ?? 'No course description is available.'}</p></header>
      {available ? <>
        {workspace.feedback ? <Notice tone={workspace.feedback.includes('could not') ? 'error' : 'success'}>{workspace.feedback}</Notice> : null}
        <EnrollmentProgressPanel progress={workspace.progress.data} progressError={workspace.progress.error} progressLoading={workspace.progress.isPending} outline={workspace.outline.data} outlineError={workspace.outline.error} outlineLoading={workspace.outline.isPending} completionState={workspace.completionState} isPending={workspace.isPending} onSetCompletion={workspace.setCompletion} onRetry={() => { retryWorkspaceRef.current = true; void workspace.retryWorkspace(); }} />
      </> : <Notice tone="info" title="Learning progress unavailable">Learning progress is not available for this enrollment.</Notice>}
    </article>
  );
}
