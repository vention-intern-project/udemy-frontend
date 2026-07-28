import {
  Button,
  ContextualNavigationLink,
  Notice,
  Skeleton,
  SkeletonGroup,
} from '../../shared/ui/primitives';
import styles from './RouteStates.module.css';

interface RetryStateProps {
  onRetry: () => void;
}

export function BootstrapState() {
  return (
    <main className={[styles.root, styles.centered].join(' ')} aria-busy="true">
      <div className={styles.card}>
        <h1>Preparing your workspace</h1>
        <p>We are verifying your session.</p>
        <SkeletonGroup label="Loading application">
          <Skeleton width="100%" />
          <Skeleton width="82%" />
          <Skeleton width="64%" />
        </SkeletonGroup>
      </div>
    </main>
  );
}

export function SessionErrorState({ onRetry }: RetryStateProps) {
  return (
    <main className={[styles.root, styles.centered].join(' ')} id="main-content">
      <div className={styles.card}>
        <h1>Session check failed</h1>
        <Notice className={styles.notice} tone="error" title="Unable to start the application">
          We could not verify your session. Check your connection and try again.
        </Notice>
        <Button onClick={onRetry}>Try again</Button>
      </div>
    </main>
  );
}

export function RenderErrorState({ onRetry }: RetryStateProps) {
  return (
    <main className={[styles.root, styles.centered].join(' ')} id="main-content">
      <div className={styles.card} role="alert" aria-labelledby="render-error-title">
        <h1 id="render-error-title">Something went wrong</h1>
        <p>We could not display this page. Try again or return to the catalog.</p>
        <div>
          <Button onClick={onRetry}>Try again</Button>
          <ContextualNavigationLink className={styles.linkButton} to="/">
            Back to catalog
          </ContextualNavigationLink>
        </div>
      </div>
    </main>
  );
}

export function ForbiddenState() {
  return (
    <section className={styles.root} aria-labelledby="forbidden-title">
      <div className={styles.card}>
        <p className={styles.eyebrow}>403</p>
        <h1 id="forbidden-title">You do not have access to this page</h1>
        <p>Use an account with the required role, or return to the catalog.</p>
        <ContextualNavigationLink className={styles.linkButton} to="/">
          Back to catalog
        </ContextualNavigationLink>
      </div>
    </section>
  );
}

export function NotFoundState() {
  return (
    <section className={styles.root} aria-labelledby="not-found-title">
      <div className={styles.card}>
        <p className={styles.eyebrow}>404</p>
        <h1 id="not-found-title">Page not found</h1>
        <p>The address may be incorrect, or the page may have moved.</p>
        <ContextualNavigationLink className={styles.linkButton} to="/">
          Back to catalog
        </ContextualNavigationLink>
      </div>
    </section>
  );
}
