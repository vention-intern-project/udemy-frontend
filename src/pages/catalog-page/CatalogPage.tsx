import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  parseCatalogQuery,
  serializeCatalogQuery,
  type CatalogQuery,
  type CatalogRequester,
  useCatalogDiscovery,
} from '@features/catalog-discovery';
import { useSession } from '@features/auth-session';
import { CatalogFilterBar } from '@widgets/catalog-filter-bar';
import {
  Button, Notice, Pagination, Skeleton, SkeletonGroup, VisuallyHidden,
} from '@shared/ui/primitives';

import styles from './CatalogPage.module.css';
import { CourseCard } from './CourseCard';
import { SortControl } from './SortControl';

function resolveBrowserSelectedFocusTarget(target: HTMLElement) {
  if (target.isConnected) return target;
  if (target instanceof HTMLInputElement && (target.name === 'min_price' || target.name === 'max_price')) {
    return document.querySelector<HTMLElement>(`input[name="${target.name}"]`);
  }
  if (target.dataset.part === 'catalog-sort-trigger' || target.dataset.part === 'catalog-sort-listbox') {
    return document.querySelector<HTMLElement>('[data-part="catalog-sort-trigger"]');
  }
  return null;
}

function getActiveCatalogSortListbox() {
  const activeElement = document.activeElement;
  return activeElement instanceof HTMLElement && activeElement.dataset.part === 'catalog-sort-listbox'
    ? activeElement
    : null;
}

function restoreBrowserSelectedFocus(target: HTMLElement) {
  const restore = () => {
    const currentTarget = resolveBrowserSelectedFocusTarget(target);
    if (!currentTarget || document.activeElement === currentTarget) return;
    if (document.activeElement instanceof HTMLElement && document.activeElement.id === 'main-content') {
      currentTarget.focus();
    }
  };
  const afterShellFocus = () => {
    if (typeof globalThis.requestAnimationFrame === 'function') {
      globalThis.requestAnimationFrame(restore);
    } else {
      globalThis.setTimeout(restore, 0);
    }
  };
  if (typeof globalThis.requestAnimationFrame === 'function') {
    globalThis.requestAnimationFrame(afterShellFocus);
  } else {
    globalThis.setTimeout(afterShellFocus, 0);
  }
}

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const pendingPriceBlurSourceRef = useRef<HTMLInputElement | null>(null);
  const pendingPriceBlurTargetRef = useRef<HTMLElement | null>(null);
  const pendingRouteFocusTargetRef = useRef<HTMLElement | null>(null);
  const search = searchParams.toString();
  const query = useMemo(() => parseCatalogQuery(new URLSearchParams(search)), [search]);
  const { requestPublic } = useSession();
  const request = useCallback<CatalogRequester>((options) => requestPublic(options), [requestPublic]);
  const discovery = useCatalogDiscovery(query, request);

  useEffect(() => {
    const canonical = serializeCatalogQuery(query);
    if (canonical !== search) setSearchParams(canonical, { replace: true });
  }, [query, search, setSearchParams]);

  useEffect(() => {
    const focusTarget = pendingRouteFocusTargetRef.current;
    if (!focusTarget) return;
    pendingRouteFocusTargetRef.current = null;
    restoreBrowserSelectedFocus(focusTarget);
  }, [search]);

  const navigate = useCallback((next: CatalogQuery) => {
    const blurSource = pendingPriceBlurSourceRef.current;
    const relatedTarget = pendingPriceBlurTargetRef.current;
    pendingPriceBlurSourceRef.current = null;
    pendingPriceBlurTargetRef.current = null;
    const commitNavigation = (focusTarget: HTMLElement | null) => {
      pendingRouteFocusTargetRef.current = focusTarget;
      setSearchParams(serializeCatalogQuery(next));
    };
    if (!blurSource) {
      commitNavigation(getActiveCatalogSortListbox());
      return;
    }
    globalThis.queueMicrotask(() => {
      const settledTarget = document.activeElement instanceof HTMLElement
        && document.activeElement !== document.body
        && document.activeElement !== blurSource
        ? document.activeElement
        : relatedTarget;
      commitNavigation(settledTarget);
    });
  }, [setSearchParams]);

  const results = discovery.data;
  const announcement = results
    ? `${results.total} ${results.total === 1 ? 'course' : 'courses'} found. Page ${results.page}.`
    : null;

  return (
    <section
      className={styles.page}
      data-part="catalog-page"
      aria-labelledby="catalog-page-title"
      onBlurCapture={(event) => {
      const source = event.target;
      if (!(source instanceof HTMLInputElement) || (source.name !== 'min_price' && source.name !== 'max_price')) return;
      const nextTarget = event.relatedTarget instanceof HTMLElement ? event.relatedTarget : null;
      pendingPriceBlurSourceRef.current = source;
      pendingPriceBlurTargetRef.current = nextTarget;
      globalThis.setTimeout(() => {
        if (pendingPriceBlurSourceRef.current === source) {
          pendingPriceBlurSourceRef.current = null;
          pendingPriceBlurTargetRef.current = null;
        }
      }, 0);
      }}
    >
      <div className={styles.hero} data-part="catalog-hero">
        <div className={styles.heroContent}>
          <h1 id="catalog-page-title">
            Master the Skills Shaping the <span className={styles.headingBreak}>Future</span>
          </h1>
          <p>Browse courses crafted by industry experts. Advance your career in technology, design, business, and leadership.</p>
        </div>
      </div>
      <div className={styles.content} data-part="catalog-content">
        <div className={styles.discoveryLayout} data-part="catalog-discovery-layout">
          <div className={styles.discoveryResults} data-part="catalog-discovery-results">
            {discovery.status === 'initial-loading' ? (
              <SkeletonGroup className={styles.skeletons} label="Loading course results">
                <Skeleton shape="rect" height={156} />
                <Skeleton shape="rect" height={156} />
                <Skeleton shape="rect" height={156} />
              </SkeletonGroup>
            ) : null}
            {discovery.status === 'refreshing' ? (
              <p className={styles.refresh} role="status">Updating course results…</p>
            ) : null}
            {discovery.failure ? (
              <Notice tone="error" title={discovery.failure.title} className={styles.notice}>
                <p>{discovery.failure.message}</p>
                <Button variant="secondary" onClick={discovery.retry}>Try again</Button>
              </Notice>
            ) : null}
            {results ? (
              <section className={styles.results} aria-labelledby="catalog-results-title">
                <div className={styles.resultsHeading}>
                  <h2 id="catalog-results-title">
                    <span>Found </span>
                    <strong className={styles.resultsTotal}>{results.total}</strong>
                    <span className={styles.resultsSuffix}> {results.total === 1 ? 'course' : 'courses'}</span>
                  </h2>
                  <div className={styles.toolbarControls} data-part="catalog-toolbar-controls">
                    <CatalogFilterBar query={query} onApply={navigate} />
                    <div className={styles.sortToolbar} data-part="catalog-sort-toolbar">
                      <div className={styles.sortField}>
                        <span className={styles.sortLabel}>Sort by:</span>
                        <SortControl
                          value={query.sort}
                          onChange={(sort) => navigate({ ...query, sort, page: 1 })}
                        />
                      </div>
                    </div>
                  </div>
                  <VisuallyHidden as="p" role="status" aria-live="polite" aria-atomic="true">
                    {announcement}
                  </VisuallyHidden>
                </div>
                {results.items.length === 0 ? (
                  <Notice tone="info" title="No courses found">Try changing or clearing your filters.</Notice>
                ) : (
                  <ul className={styles.list} data-part="catalog-result-list">
                    {results.items.map((course) => <CourseCard key={course.id} course={course} />)}
                  </ul>
                )}
                {results.pages > 0 ? (
                  <Pagination
                    currentPage={results.page}
                    totalPages={results.pages}
                    hasNext={results.hasNext}
                    hasPrevious={results.hasPrevious}
                    label="Course result pages"
                    directionDisplay="arrows"
                    onPageChange={(page) => navigate({ ...query, page })}
                  />
                ) : null}
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
