import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import type { CatalogCourse } from '@entities/course';
import {
  parseCatalogQuery, serializeCatalogQuery, type CatalogQuery, type CatalogRequester,
  CATALOG_SORT_VALUES, useCatalogDiscovery,
} from '@features/catalog-discovery';
import { useSession } from '@features/auth-session';
import { CatalogFilterBar } from '@widgets/catalog-filter-bar';
import { Button, Notice, Pagination, Skeleton, SkeletonGroup } from '@shared/ui/primitives';

import './catalog-page.css';

const DECIMAL_PRICE = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const CURRENCY_CODE = /^[A-Z]{3}$/;
const TOOLTIP_VIEWPORT_GUTTER = 12;
const TOOLTIP_CONNECTOR_WIDTH = 8;
const TOOLTIP_PREFERRED_WIDTH = 320;
const TOOLTIP_MINIMUM_WIDTH = 220;
const SORT_LABEL: Readonly<Record<(typeof CATALOG_SORT_VALUES)[number], string>> = {
  created_at: 'Oldest',
  '-created_at': 'Newest',
  price: 'Low to High',
  '-price': 'High to Low',
  title: 'A to Z',
  '-title': 'Z to A',
};

type TooltipPlacement =
  | { mode: 'inline' }
  | { mode: 'side'; side: 'left' | 'right'; left: number; top: number; width: number };

interface CourseCardProps {
  course: CatalogCourse;
}

interface SortControlProps {
  value: CatalogQuery['sort'];
  onChange: (sort: CatalogQuery['sort']) => void;
}

function sameTooltipPlacement(current: TooltipPlacement | null, next: TooltipPlacement): boolean {
  if (!current || current.mode !== next.mode) return false;
  if (current.mode === 'inline' || next.mode === 'inline') return true;
  return current.side === next.side
    && current.left === next.left
    && current.top === next.top
    && current.width === next.width;
}

function formatCatalogPrice(price: string, currency: string): string {
  if (!DECIMAL_PRICE.test(price) || !CURRENCY_CODE.test(currency)) return 'Price unavailable';

  try {
    const currencyMarker = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0).find((part) => part.type === 'currency')?.value;
    if (!currencyMarker) return 'Price unavailable';
    return /^[\p{L}]+$/u.test(currencyMarker)
      ? `${currencyMarker}\u00A0${price}`
      : `${currencyMarker}${price}`;
  } catch {
    return 'Price unavailable';
  }
}

function CourseCard({ course }: CourseCardProps) {
  const previewCue = course.isPublished ? 'View details' : 'View Draft';
  const tooltipNotice = course.isPublished ? null : 'This course is not available for enrollment yet.';
  const statusExplanationId = `catalog-course-${course.id}-status`;
  const description = course.description ?? 'No course description is available.';
  const linkRef = useRef<HTMLAnchorElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [isPointerOver, setIsPointerOver] = useState(false);
  const [isLinkFocused, setIsLinkFocused] = useState(false);
  const [tooltipPlacement, setTooltipPlacement] = useState<TooltipPlacement | null>(null);
  const tooltipOpen = isPointerOver || isLinkFocused;
  const tooltipPlacementMode = tooltipPlacement?.mode;
  const tooltipPlacementWidth = tooltipPlacement?.mode === 'side' ? tooltipPlacement.width : null;

  const updateTooltipPlacement = useCallback(() => {
    const link = linkRef.current;
    const tooltip = tooltipRef.current;
    if (!link || !tooltip) return;

    const clientWidth = document.documentElement.clientWidth;
    const clientHeight = document.documentElement.clientHeight;
    const linkRect = link.getBoundingClientRect();
    const headerBottom = document.querySelector<HTMLElement>('.app-header')?.getBoundingClientRect().bottom ?? 0;
    const availableRight = clientWidth - linkRect.right;
    const availableLeft = linkRect.left;
    const side = availableRight >= TOOLTIP_PREFERRED_WIDTH + TOOLTIP_CONNECTOR_WIDTH + TOOLTIP_VIEWPORT_GUTTER || availableRight >= availableLeft
      ? 'right'
      : 'left';
    const availableSide = side === 'right' ? availableRight : availableLeft;
    const width = Math.min(
      TOOLTIP_PREFERRED_WIDTH,
      availableSide - TOOLTIP_CONNECTOR_WIDTH - TOOLTIP_VIEWPORT_GUTTER,
    );
    const nextPlacement: TooltipPlacement = clientWidth < 768 || width < TOOLTIP_MINIMUM_WIDTH
      ? { mode: 'inline' }
      : (() => {
        const tooltipHeight = tooltip.getBoundingClientRect().height;
        const minimumTop = Math.max(TOOLTIP_VIEWPORT_GUTTER, headerBottom + TOOLTIP_VIEWPORT_GUTTER);
        const maximumTop = clientHeight - tooltipHeight - TOOLTIP_VIEWPORT_GUTTER;
        if (maximumTop < minimumTop) return { mode: 'inline' };
        const top = Math.min(
          Math.max(linkRect.top + (linkRect.height / 2) - (tooltipHeight / 2), minimumTop),
          maximumTop,
        );
        return {
          mode: 'side',
          side,
          width,
          left: side === 'right'
            ? linkRect.right + TOOLTIP_CONNECTOR_WIDTH
            : linkRect.left - TOOLTIP_CONNECTOR_WIDTH - width,
          top,
        };
      })();

    setTooltipPlacement((current) => (
      sameTooltipPlacement(current, nextPlacement) ? current : nextPlacement
    ));
  }, []);

  useLayoutEffect(() => {
    if (!tooltipOpen) return undefined;

    updateTooltipPlacement();
    let frame = 0;
    const schedulePlacementUpdate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateTooltipPlacement);
    };
    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(schedulePlacementUpdate);
    if (linkRef.current) observer?.observe(linkRef.current);
    if (tooltipRef.current) observer?.observe(tooltipRef.current);
    const visualViewport = window.visualViewport;

    window.addEventListener('resize', schedulePlacementUpdate);
    visualViewport?.addEventListener('resize', schedulePlacementUpdate);
    visualViewport?.addEventListener('scroll', schedulePlacementUpdate);
    document.addEventListener('scroll', schedulePlacementUpdate, true);

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', schedulePlacementUpdate);
      visualViewport?.removeEventListener('resize', schedulePlacementUpdate);
      visualViewport?.removeEventListener('scroll', schedulePlacementUpdate);
      document.removeEventListener('scroll', schedulePlacementUpdate, true);
    };
  }, [tooltipOpen, updateTooltipPlacement]);

  useLayoutEffect(() => {
    if (tooltipOpen) updateTooltipPlacement();
  }, [tooltipOpen, tooltipPlacementMode, tooltipPlacementWidth, updateTooltipPlacement]);

  const tooltipStyle = tooltipPlacement?.mode === 'side'
    ? {
      '--catalog-tooltip-left': `${tooltipPlacement.left}px`,
      '--catalog-tooltip-top': `${tooltipPlacement.top}px`,
      '--catalog-tooltip-width': `${tooltipPlacement.width}px`,
    } as CSSProperties
    : undefined;
  const actionLabel = !course.isPublished
    ? 'Not available'
    : /^0(?:\.0+)?$/.test(course.price) ? 'Enroll Free' : 'Add to cart';

  return (
    <li className="catalog-page__item">
      <article className="catalog-card">
        <Link
          ref={linkRef}
          className="catalog-card__link"
          to={`/courses/${course.id}`}
          aria-label={course.title}
          aria-describedby={statusExplanationId}
          onPointerEnter={() => setIsPointerOver(true)}
          onPointerLeave={() => setIsPointerOver(false)}
          onFocus={() => setIsLinkFocused(true)}
          onBlur={() => setIsLinkFocused(false)}
        >
          <div className="catalog-card__preview">
            <span className="catalog-card__preview-cue">{previewCue}</span>
          </div>
          <div className="catalog-card__body">
            <h3 className="catalog-card__title">{course.title}</h3>
            <div className="catalog-card__meta">
              <span className="catalog-card__byline">{course.instructorName}</span>
              <span className="catalog-card__meta-separator" aria-hidden="true"> · </span>
              <span className="catalog-card__lesson-count">{course.totalLessonCount} lesson{course.totalLessonCount === 1 ? '' : 's'}</span>
            </div>
          </div>
          <span
            ref={tooltipRef}
            className={[
              'catalog-card__tooltip',
              tooltipPlacement?.mode === 'side' ? `catalog-card__tooltip--${tooltipPlacement.side}` : 'catalog-card__tooltip--inline',
              tooltipOpen && 'catalog-card__tooltip--open',
            ].filter(Boolean).join(' ')}
            id={statusExplanationId}
            role="tooltip"
            style={tooltipStyle}
          >
            {tooltipNotice ? <span className="catalog-card__tooltip-notice">{tooltipNotice}</span> : null}
            <span className="catalog-card__tooltip-course" aria-hidden="true">About {course.title}</span>
            <span className="catalog-card__tooltip-description">{description}</span>
          </span>
          <div className="catalog-card__price"><data value={course.price}>{formatCatalogPrice(course.price, course.currency)}</data></div>
        </Link>
        <div className="catalog-card__actions"><Button type="button" disabled className="catalog-card__action-button">{actionLabel}</Button></div>
      </article>
    </li>
  );
}

function SortControl({ value, onChange }: SortControlProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const focusListboxRef = useRef(false);
  const finePointerHoverRef = useRef(false);
  const activeIndexRef = useRef<number | null>(null);
  const listboxId = `catalog-sort-options-${useId()}`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const selectedIndex = Math.max(0, CATALOG_SORT_VALUES.indexOf(value));
  const activeOptionId = activeIndex === null ? undefined : `${listboxId}-option-${activeIndex}`;

  const setActive = useCallback((index: number | null) => {
    activeIndexRef.current = index;
    setActiveIndex(index);
  }, []);

  const close = useCallback((restoreFocus = false) => {
    focusListboxRef.current = false;
    setOpen(false);
    setActive(null);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }, [setActive]);

  const openList = useCallback((index = selectedIndex, focusListbox = false) => {
    focusListboxRef.current = focusListbox;
    setActive(index);
    setOpen(true);
  }, [selectedIndex, setActive]);

  useEffect(() => {
    close();
  }, [close, value]);

  const setListboxRef = useCallback((element: HTMLDivElement | null) => {
    if (element && focusListboxRef.current) {
      focusListboxRef.current = false;
      element.focus();
    }
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer, true);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer, true);
  }, [close, open]);

  const select = useCallback((index: number) => {
    const sort = CATALOG_SORT_VALUES[index];
    if (!sort) return;
    close();
    onChange(sort);
  }, [close, onChange]);

  const supportsFinePointerHover = (pointerType: string) => pointerType === 'mouse'
    && (typeof window.matchMedia !== 'function' || window.matchMedia('(hover: hover) and (pointer: fine)').matches);

  return (
    <div
      ref={rootRef}
      className={['catalog-page__sort-control', open && 'catalog-page__sort-control--open'].filter(Boolean).join(' ')}
      onPointerEnter={(event) => {
        finePointerHoverRef.current = supportsFinePointerHover(event.pointerType);
        if (finePointerHoverRef.current) openList(selectedIndex);
      }}
      onPointerLeave={() => {
        if (finePointerHoverRef.current) close();
        finePointerHoverRef.current = false;
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close();
      }}
    >
      <button
        ref={triggerRef}
        className="catalog-page__sort-trigger"
        type="button"
        aria-label={`Sort by: ${SORT_LABEL[value]}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => {
          if (finePointerHoverRef.current) {
            if (!open) openList(selectedIndex);
            return;
          }
          if (open) close();
          else openList(selectedIndex, true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openList(selectedIndex, true);
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            openList(Math.min(selectedIndex + 1, CATALOG_SORT_VALUES.length - 1), true);
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            openList(Math.max(selectedIndex - 1, 0), true);
          }
        }}
      >
        <span>{SORT_LABEL[value]}</span>
        <span className="catalog-page__sort-chevron" aria-hidden="true" />
      </button>
      {open ? (
        <div
          ref={setListboxRef}
          className="catalog-page__sort-listbox"
          id={listboxId}
          role="listbox"
          aria-label="Sort by options"
          tabIndex={-1}
          aria-activedescendant={activeOptionId}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActive(Math.min((activeIndexRef.current ?? selectedIndex) + 1, CATALOG_SORT_VALUES.length - 1));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActive(Math.max((activeIndexRef.current ?? selectedIndex) - 1, 0));
            } else if (event.key === 'Home') {
              event.preventDefault();
              setActive(0);
            } else if (event.key === 'End') {
              event.preventDefault();
              setActive(CATALOG_SORT_VALUES.length - 1);
            } else if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              if (activeIndexRef.current !== null) select(activeIndexRef.current);
            } else if (event.key === 'Escape') {
              event.preventDefault();
              close(true);
            } else if (event.key === 'Tab') {
              close();
            }
          }}
        >
          {CATALOG_SORT_VALUES.map((sort, index) => (
            <div
              key={sort}
              id={`${listboxId}-option-${index}`}
              className={['catalog-page__sort-option', activeIndex === index && 'catalog-page__sort-option--active'].filter(Boolean).join(' ')}
              role="option"
              aria-selected={value === sort}
              onPointerDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => select(index)}
            >
              <span className="catalog-page__sort-radio" aria-hidden="true" />
              {SORT_LABEL[sort]}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.toString();
  const query = useMemo(() => parseCatalogQuery(new URLSearchParams(search)), [search]);
  const { requestOptional } = useSession();
  const request = useCallback<CatalogRequester>((options) => requestOptional(options), [requestOptional]);
  const discovery = useCatalogDiscovery(query, request);

  useEffect(() => {
    const canonical = serializeCatalogQuery(query);
    if (canonical !== search) setSearchParams(canonical, { replace: true });
  }, [query, search, setSearchParams]);

  const navigate = useCallback((next: CatalogQuery) => {
    setSearchParams(serializeCatalogQuery(next));
  }, [setSearchParams]);

  const results = discovery.data;
  const announcement = results
    ? `${results.total} ${results.total === 1 ? 'course' : 'courses'} found. Page ${results.page}.`
    : null;

  return (
    <section className="catalog-page" aria-labelledby="catalog-page-title">
      <div className="catalog-hero">
        <div className="catalog-hero__content">
          <h1 id="catalog-page-title">Master the Skills Shaping the <span className="catalog-hero__heading-break">Future</span></h1>
          <p>Browse courses crafted by industry experts. Advance your career in technology, design, business, and leadership.</p>
        </div>
      </div>
      <div className="catalog-page__content">
        <div className="catalog-page__discovery-layout">
          <div className="catalog-page__discovery-results">

      {discovery.status === 'initial-loading' ? (
        <SkeletonGroup className="catalog-page__skeletons" label="Loading course results">
          <Skeleton shape="rect" height={156} />
          <Skeleton shape="rect" height={156} />
          <Skeleton shape="rect" height={156} />
        </SkeletonGroup>
      ) : null}
      {discovery.status === 'refreshing' ? <p className="catalog-page__refresh" role="status">Updating course results…</p> : null}
      {discovery.failure ? (
        <Notice tone="error" title={discovery.failure.title} className="catalog-page__notice">
          <p>{discovery.failure.message}</p>
          <Button variant="secondary" onClick={discovery.retry}>Try again</Button>
        </Notice>
      ) : null}

      {results ? (
        <section className="catalog-page__results" aria-labelledby="catalog-results-title">
          <div className="catalog-page__results-heading">
            <h2 id="catalog-results-title">
              <span className="catalog-page__results-prefix">Found </span>
              <strong className="catalog-page__results-total">{results.total}</strong>
              <span className="catalog-page__results-suffix"> {results.total === 1 ? 'course' : 'courses'}</span>
            </h2>
            <div className="catalog-page__toolbar-controls">
              <CatalogFilterBar query={query} onApply={navigate} />
              <div className="catalog-page__sort-toolbar">
                <div className="catalog-page__sort-field">
                  <span className="catalog-page__sort-label">Sort by:</span>
                  <SortControl
                    value={query.sort}
                    onChange={(sort) => navigate({ ...query, sort, page: 1 })}
                  />
                </div>
              </div>
            </div>
            <p className="ui-sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
          </div>
          {results.items.length === 0 ? (
            <Notice tone="info" title="No courses found">Try changing or clearing your filters.</Notice>
          ) : (
            <ul className="catalog-page__list">{results.items.map((course) => <CourseCard key={course.id} course={course} />)}</ul>
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
