import { Link } from 'react-router-dom';

import { Button, Notice, Skeleton, SkeletonGroup } from '../../shared/ui/primitives';

export function BootstrapState() {
  return (
    <main className="app-state app-state--centered" role="status" aria-live="polite" aria-busy="true">
      <div className="app-state__card">
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

export function SessionErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="app-state app-state--centered" id="main-content">
      <div className="app-state__card">
        <h1>Session check failed</h1>
        <Notice tone="error" title="Unable to start the application">
          We could not verify your session. Check your connection and try again.
        </Notice>
        <Button onClick={onRetry}>Try again</Button>
      </div>
    </main>
  );
}

export function RenderErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="app-state app-state--centered" id="main-content">
      <div className="app-state__card" role="alert" aria-labelledby="render-error-title">
        <h1 id="render-error-title">Something went wrong</h1>
        <p>We could not display this page. Try again or return to the catalog.</p>
        <div className="app-state__actions">
          <Button onClick={onRetry}>Try again</Button>
          <Link className="app-link-button" to="/">Back to catalog</Link>
        </div>
      </div>
    </main>
  );
}

export function ForbiddenState() {
  return (
    <section className="app-state" aria-labelledby="forbidden-title">
      <div className="app-state__card">
        <p className="app-state__eyebrow">403</p>
        <h1 id="forbidden-title">You do not have access to this page</h1>
        <p>Use an account with the required role, or return to the catalog.</p>
        <Link className="app-link-button" to="/">Back to catalog</Link>
      </div>
    </section>
  );
}

export function NotFoundState() {
  return (
    <section className="app-state" aria-labelledby="not-found-title">
      <div className="app-state__card">
        <p className="app-state__eyebrow">404</p>
        <h1 id="not-found-title">Page not found</h1>
        <p>The address may be incorrect, or the page may have moved.</p>
        <Link className="app-link-button" to="/">Back to catalog</Link>
      </div>
    </section>
  );
}
