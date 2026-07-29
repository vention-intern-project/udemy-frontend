import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  catalogResultSetKey,
  parseCatalogQuery,
  serializeCatalogQuery,
  type CatalogQuery,
  type CatalogRequester,
  useCatalogDiscovery,
} from '@features/catalog-discovery';
import { useSession } from '@features/auth-session';
import { CatalogFilterBar } from '@widgets/catalog-filter-bar';
import { Button, Notice, Pagination, Skeleton, VisuallyHidden } from '@shared/ui/primitives';

import styles from './CatalogPage.module.css';
import { CourseCard } from './CourseCard';
import { SortControl } from './SortControl';
import { useCatalogCourseActions } from './useCatalogCourseActions';

type CourseDisclosureId = number;
type RefreshAnnouncement = 'Course results updated.' | 'Updating course results…' | null;

type DisclosureDismissOptions = {
  returnFocus?: boolean;
};

interface CatalogResultTotal {
  readonly criteriaKey: string;
  readonly presentationKey: string;
  readonly total: number;
}

interface CatalogPaginationSnapshot {
  readonly criteriaKey: string;
  readonly totalPages: number;
}

function resolveBrowserSelectedFocusTarget(target: HTMLElement) {
  if (target.isConnected) return target;
  if (
    target instanceof HTMLInputElement &&
    (target.name === 'min_price' || target.name === 'max_price')
  ) {
    return document.querySelector<HTMLElement>(`input[name="${target.name}"]`);
  }
  if (
    target.dataset.part === 'catalog-sort-trigger' ||
    target.dataset.part === 'catalog-sort-listbox'
  ) {
    return document.querySelector<HTMLElement>('[data-part="catalog-sort-trigger"]');
  }
  return null;
}

function getActiveCatalogSortListbox() {
  const activeElement = document.activeElement;
  return activeElement instanceof HTMLElement &&
    activeElement.dataset.part === 'catalog-sort-listbox'
    ? activeElement
    : null;
}

function restoreBrowserSelectedFocus(target: HTMLElement) {
  const restore = () => {
    const currentTarget = resolveBrowserSelectedFocusTarget(target);
    if (!currentTarget || document.activeElement === currentTarget) return;
    if (
      document.activeElement instanceof HTMLElement &&
      document.activeElement.id === 'main-content'
    ) {
      currentTarget.focus({ preventScroll: true });
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
  const transientHoverSuppressedCourseIdRef = useRef<CourseDisclosureId | null>(null);
  const [pinnedDisclosureCourseId, setPinnedDisclosureCourseId] =
    useState<CourseDisclosureId | null>(null);
  const pinnedDisclosureCourseIdRef = useRef<CourseDisclosureId | null>(null);
  const [transientPreviewCourseId, setTransientPreviewCourseId] =
    useState<CourseDisclosureId | null>(null);
  const activeDisclosureCourseIdRef = useRef<CourseDisclosureId | null>(null);
  const refreshWasPendingRef = useRef(false);
  const [refreshAnnouncement, setRefreshAnnouncement] = useState<RefreshAnnouncement>(null);
  const [lastKnownResultTotal, setLastKnownResultTotal] = useState<CatalogResultTotal | null>(null);
  const [lastKnownPagination, setLastKnownPagination] = useState<CatalogPaginationSnapshot | null>(
    null,
  );
  const search = searchParams.toString();
  const query = useMemo(() => parseCatalogQuery(new URLSearchParams(search)), [search]);
  const queryKey = useMemo(() => serializeCatalogQuery(query), [query]);
  const criteriaKey = useMemo(() => catalogResultSetKey(query), [query]);
  const presentationKey = useMemo(() => serializeCatalogQuery({ ...query, page: 1 }), [query]);
  const { requestPublic } = useSession();
  const request = useCallback<CatalogRequester>(
    (options) => requestPublic(options),
    [requestPublic],
  );
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

  const navigate = useCallback(
    (next: CatalogQuery) => {
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
        const settledTarget =
          document.activeElement instanceof HTMLElement &&
          document.activeElement !== document.body &&
          document.activeElement !== blurSource
            ? document.activeElement
            : relatedTarget;
        commitNavigation(settledTarget);
      });
    },
    [setSearchParams],
  );

  const beginTransientDisclosurePreview = useCallback((courseId: CourseDisclosureId) => {
    if (
      pinnedDisclosureCourseIdRef.current !== null ||
      transientHoverSuppressedCourseIdRef.current === courseId
    )
      return;
    setTransientPreviewCourseId(courseId);
  }, []);
  const endTransientDisclosurePreview = useCallback((courseId: CourseDisclosureId) => {
    setTransientPreviewCourseId((currentCourseId) =>
      currentCourseId === courseId ? null : currentCourseId,
    );
  }, []);
  const suppressTransientHoverAfterPointerSort = useCallback((clientX: number, clientY: number) => {
    setTransientPreviewCourseId(null);
    globalThis.requestAnimationFrame(() => {
      const uncoveredCard = document
        .elementsFromPoint(clientX, clientY)
        .find((element) => element.closest<HTMLElement>('[data-course-card-id]'))
        ?.closest<HTMLElement>('[data-course-card-id]');
      transientHoverSuppressedCourseIdRef.current = uncoveredCard
        ? Number(uncoveredCard.dataset.courseCardId)
        : null;
    });
  }, []);
  const clearTransientHoverSuppression = useCallback((courseId: CourseDisclosureId) => {
    if (transientHoverSuppressedCourseIdRef.current === courseId) {
      transientHoverSuppressedCourseIdRef.current = null;
    }
  }, []);
  const togglePinnedDisclosure = useCallback((courseId: CourseDisclosureId) => {
    setTransientPreviewCourseId(null);
    setPinnedDisclosureCourseId((currentCourseId) => {
      const nextCourseId = currentCourseId === courseId ? null : courseId;
      pinnedDisclosureCourseIdRef.current = nextCourseId;
      return nextCourseId;
    });
  }, []);
  const dismissDisclosure = useCallback((options: DisclosureDismissOptions = {}) => {
    const activeCourseId = activeDisclosureCourseIdRef.current;
    setTransientPreviewCourseId(null);
    pinnedDisclosureCourseIdRef.current = null;
    setPinnedDisclosureCourseId(null);
    if (!options.returnFocus || activeCourseId === null) return;
    globalThis.requestAnimationFrame(() => {
      document
        .getElementById(`catalog-course-${activeCourseId}-disclosure-trigger`)
        ?.focus({ preventScroll: true });
    });
  }, []);
  const visibleDisclosureCourseId = transientPreviewCourseId ?? pinnedDisclosureCourseId;

  useEffect(() => {
    activeDisclosureCourseIdRef.current = visibleDisclosureCourseId;
  }, [visibleDisclosureCourseId]);

  useEffect(() => {
    if (visibleDisclosureCourseId === null) return undefined;
    const dismissOutsideDisclosure = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const activeCard = document.querySelector<HTMLElement>(
        `[data-course-card-id="${visibleDisclosureCourseId}"]`,
      );
      if (!activeCard?.contains(target)) dismissDisclosure();
    };
    const dismissWithEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      dismissDisclosure({ returnFocus: true });
    };
    document.addEventListener('pointerdown', dismissOutsideDisclosure, true);
    document.addEventListener('keydown', dismissWithEscape);
    return () => {
      document.removeEventListener('pointerdown', dismissOutsideDisclosure, true);
      document.removeEventListener('keydown', dismissWithEscape);
    };
  }, [dismissDisclosure, visibleDisclosureCourseId]);

  const results = discovery.data;
  const isInitialLoading = discovery.status === 'initial-loading';
  const isRefreshing = discovery.status === 'refreshing';
  const isUpdating = isInitialLoading || isRefreshing;
  const retainedResultsTotal =
    lastKnownResultTotal?.presentationKey === presentationKey ? lastKnownResultTotal.total : null;
  const currentResults = discovery.dataQueryKey === queryKey ? results : undefined;
  const isChangedCriteriaLoading =
    isInitialLoading && lastKnownResultTotal?.presentationKey !== presentationKey;
  const visibleResultsTotal = currentResults?.total ?? retainedResultsTotal;
  const retainedPagination =
    lastKnownPagination?.criteriaKey === criteriaKey ? lastKnownPagination : null;
  const visiblePagination = currentResults
    ? {
        currentPage: currentResults.page,
        hasNext: currentResults.hasNext,
        hasPrevious: currentResults.hasPrevious,
        totalPages: currentResults.pages,
      }
    : retainedPagination
      ? {
          currentPage: query.page,
          hasNext: query.page < retainedPagination.totalPages,
          hasPrevious: query.page > 1,
          totalPages: retainedPagination.totalPages,
        }
      : null;
  const courseActions = useCatalogCourseActions(results?.items ?? []);

  useLayoutEffect(() => {
    if (!currentResults) return;
    setLastKnownResultTotal((current) =>
      current?.presentationKey === presentationKey && current.total === currentResults.total
        ? current
        : { criteriaKey, presentationKey, total: currentResults.total },
    );
    setLastKnownPagination((current) =>
      current?.criteriaKey === criteriaKey && current.totalPages === currentResults.pages
        ? current
        : { criteriaKey, totalPages: currentResults.pages },
    );
  }, [criteriaKey, currentResults, presentationKey]);

  useEffect(() => {
    if (isRefreshing) {
      refreshWasPendingRef.current = true;
      setRefreshAnnouncement('Updating course results…');
      return;
    }
    if (!refreshWasPendingRef.current) return;
    refreshWasPendingRef.current = false;
    setRefreshAnnouncement(
      discovery.status === 'populated' || discovery.status === 'empty'
        ? 'Course results updated.'
        : null,
    );
  }, [discovery.status, isRefreshing]);

  return (
    <section
      className={styles.page}
      data-part="catalog-page"
      aria-labelledby="catalog-page-title"
      onBlurCapture={(event) => {
        const source = event.target;
        if (
          !(source instanceof HTMLInputElement) ||
          (source.name !== 'min_price' && source.name !== 'max_price')
        )
          return;
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
          <p>
            Browse courses crafted by industry experts. Advance your career in technology, design,
            business, and leadership.
          </p>
        </div>
      </div>
      <div className={styles.content} data-part="catalog-content">
        <div className={styles.discoveryLayout} data-part="catalog-discovery-layout">
          <div
            className={styles.discoveryResults}
            data-part="catalog-discovery-results"
            aria-busy={isUpdating}
          >
            <section className={styles.results} aria-labelledby="catalog-results-title">
              <div className={styles.resultsHeading}>
                <VisuallyHidden
                  as="p"
                  aria-atomic="true"
                  aria-label="Catalog refresh status"
                  aria-live="polite"
                  data-part="catalog-refresh-status"
                  role="status"
                >
                  {refreshAnnouncement}
                </VisuallyHidden>
                <h2 id="catalog-results-title">
                  {isChangedCriteriaLoading ? (
                    'Loading course results…'
                  ) : visibleResultsTotal !== null ? (
                    <>
                      <span>Found </span>
                      <strong className={styles.resultsTotal}>{visibleResultsTotal}</strong>
                      <span className={styles.resultsSuffix}>
                        {' '}
                        {visibleResultsTotal === 1 ? 'course' : 'courses'}
                      </span>
                    </>
                  ) : (
                    'Course results unavailable.'
                  )}
                </h2>
                <div className={styles.toolbarControls} data-part="catalog-toolbar-controls">
                  <CatalogFilterBar query={query} onApply={navigate} />
                  <div className={styles.sortToolbar} data-part="catalog-sort-toolbar">
                    <div className={styles.sortField}>
                      <span className={styles.sortLabel} aria-hidden="true">
                        <span className={styles.sortBy} aria-hidden="true">
                          Sort by:
                        </span>
                        <span className={styles.sortCompact} aria-hidden="true">
                          Sort
                        </span>
                      </span>
                      <SortControl
                        value={query.sort}
                        onChange={(sort) => navigate({ ...query, sort, page: 1 })}
                        onPointerOptionCommit={suppressTransientHoverAfterPointerSort}
                      />
                    </div>
                  </div>
                </div>
              </div>
              {discovery.failure ? (
                <Notice tone="error" title={discovery.failure.title} className={styles.notice}>
                  <p>{discovery.failure.message}</p>
                  <Button variant="secondary" onClick={discovery.retry}>
                    Try again
                  </Button>
                </Notice>
              ) : null}
              {discovery.status === 'initial-loading' ? (
                <ul
                  className={[styles.list, styles.skeletons].join(' ')}
                  data-part="catalog-result-list"
                  aria-hidden="true"
                >
                  {Array.from({ length: discovery.placeholderCount }, (_, index) => (
                    <li key={`catalog-placeholder-${index}`}>
                      <Skeleton shape="rect" height={320} />
                    </li>
                  ))}
                </ul>
              ) : null}
              {results?.items.length === 0 ? (
                <Notice tone="info" title="No courses found">
                  Try changing or clearing your filters.
                </Notice>
              ) : results ? (
                <ul className={styles.list} data-part="catalog-result-list">
                  {results.items.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      isDisclosureVisible={visibleDisclosureCourseId === course.id}
                      isDisclosurePinned={pinnedDisclosureCourseId === course.id}
                      hasPinnedDisclosure={pinnedDisclosureCourseId !== null}
                      onTransientDisclosurePreviewStart={beginTransientDisclosurePreview}
                      onTransientDisclosurePreviewEnd={endTransientDisclosurePreview}
                      onTransientDisclosurePreviewExit={clearTransientHoverSuppression}
                      onDisclosurePinToggle={togglePinnedDisclosure}
                      action={courseActions.actionFor(course)}
                      onAction={() => courseActions.submitAction(course)}
                    />
                  ))}
                </ul>
              ) : null}
              {visiblePagination && visiblePagination.totalPages > 0 ? (
                <Pagination
                  currentPage={visiblePagination.currentPage}
                  totalPages={visiblePagination.totalPages}
                  hasNext={visiblePagination.hasNext}
                  hasPrevious={visiblePagination.hasPrevious}
                  label="Course result pages"
                  directionDisplay="arrows"
                  onPageChange={(page) => navigate({ ...query, page })}
                />
              ) : null}
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}
