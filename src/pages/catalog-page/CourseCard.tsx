import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type PointerEvent,
} from 'react';
import { Link } from 'react-router-dom';
import { CircleCheck, ShoppingCart, Trash2, UserPlus, type LucideIcon } from 'lucide-react';

import type { CatalogCourse } from '@entities/course';
import { Button, type ButtonVariant } from '@shared/ui/primitives';

import styles from './CourseCard.module.css';
import type {
  CatalogCourseActionPresentation,
  CatalogCourseActionState,
} from './useCatalogCourseActions';

const DECIMAL_PRICE = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const CURRENCY_CODE = /^[A-Z]{3}$/;
const TOOLTIP_VIEWPORT_GUTTER = 12;
const TOOLTIP_CONNECTOR_WIDTH = 8;
const TOOLTIP_PREFERRED_WIDTH = 320;
const TOOLTIP_MINIMUM_WIDTH = 220;
const DISCLOSURE_OPEN_DELAY = 280;
const DISCLOSURE_CLOSE_DELAY = 180;
const TOOLTIP_CONNECTOR_SAFE_INSET = 24;

type TooltipPlacement =
  | {
      mode: 'side';
      side: 'left' | 'right';
      left: number;
      top: number;
      width: number;
      maxHeight: number;
      connectorOffset: number;
    }
  | { mode: 'bottom'; left: number; width: number; maxHeight: number; connectorOffset: number };

type CourseDisclosureCallback = (courseId: number) => void;

interface CourseActionVisual {
  Icon: LucideIcon | null;
  buttonVariant: ButtonVariant;
}

interface CourseCardProps {
  course: CatalogCourse;
  isDisclosureVisible: boolean;
  isDisclosurePinned: boolean;
  hasPinnedDisclosure: boolean;
  onTransientDisclosurePreviewStart: CourseDisclosureCallback;
  onTransientDisclosurePreviewEnd: CourseDisclosureCallback;
  onTransientDisclosurePreviewExit: CourseDisclosureCallback;
  onDisclosurePinToggle: CourseDisclosureCallback;
  action: CatalogCourseActionState;
  onAction(): void;
}

function clampConnectorOffset(offset: number, size: number): number {
  const safeInset = Math.min(TOOLTIP_CONNECTOR_SAFE_INSET, size / 2);
  return Math.min(Math.max(offset, safeInset), size - safeInset);
}

function sameTooltipPlacement(current: TooltipPlacement | null, next: TooltipPlacement): boolean {
  if (!current || current.mode !== next.mode) return false;
  if (current.mode === 'bottom' || next.mode === 'bottom') {
    return (
      current.mode === 'bottom' &&
      next.mode === 'bottom' &&
      current.left === next.left &&
      current.width === next.width &&
      current.maxHeight === next.maxHeight &&
      current.connectorOffset === next.connectorOffset
    );
  }
  return (
    current.side === next.side &&
    current.left === next.left &&
    current.top === next.top &&
    current.width === next.width &&
    current.maxHeight === next.maxHeight &&
    current.connectorOffset === next.connectorOffset
  );
}

function supportsFinePointer(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches
  );
}

function courseActionVisual(presentation: CatalogCourseActionPresentation): CourseActionVisual {
  switch (presentation) {
    case 'add-to-cart':
      return { Icon: ShoppingCart, buttonVariant: 'primary' };
    case 'enroll-free':
      return { Icon: UserPlus, buttonVariant: 'primary' };
    case 'enrolled':
      return { Icon: CircleCheck, buttonVariant: 'secondary' };
    case 'remove':
      return { Icon: Trash2, buttonVariant: 'secondary' };
    case 'neutral':
      return { Icon: null, buttonVariant: 'primary' };
  }
}

function catalogActionLabel(presentation: CatalogCourseActionPresentation, label: string): string {
  if (presentation === 'add-to-cart' && label === 'Log in to add to cart') return 'Add to cart';
  if (presentation === 'enroll-free' && label === 'Log in to enroll free') return 'Enroll free';
  return presentation === 'neutral' && label === 'Course is not published'
    ? 'Not published'
    : label;
}

function formatCatalogPrice(price: string, currency: string): string {
  if (!DECIMAL_PRICE.test(price) || !CURRENCY_CODE.test(currency)) return 'Price unavailable';
  if (/^0(?:\.0+)?$/.test(price)) return 'FREE';
  try {
    const currencyMarker = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    })
      .formatToParts(0)
      .find((part) => part.type === 'currency')?.value;
    if (!currencyMarker) return 'Price unavailable';
    return /^[\p{L}]+$/u.test(currencyMarker)
      ? `${currencyMarker}\u00A0${price}`
      : `${currencyMarker}${price}`;
  } catch {
    return 'Price unavailable';
  }
}

export function CourseCard({
  course,
  isDisclosureVisible,
  isDisclosurePinned,
  hasPinnedDisclosure,
  onTransientDisclosurePreviewStart,
  onTransientDisclosurePreviewEnd,
  onTransientDisclosurePreviewExit,
  onDisclosurePinToggle,
  action,
  onAction,
}: CourseCardProps) {
  const previewCue = course.isPublished ? 'View details' : 'View draft';
  const tooltipNotice = course.isPublished
    ? null
    : 'This course is not available for enrollment yet.';
  const statusExplanationId = `catalog-course-${course.id}-status`;
  const description = course.description ?? 'No course description is available.';
  const linkRef = useRef<HTMLAnchorElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const [tooltipPlacement, setTooltipPlacement] = useState<TooltipPlacement | null>(null);
  const tooltipPlacementMode = tooltipPlacement?.mode;
  const tooltipPlacementWidth = tooltipPlacement?.width;

  const updateTooltipPlacement = useCallback(() => {
    const link = linkRef.current;
    const tooltip = tooltipRef.current;
    if (!link || !tooltip) return;
    const documentZoom = Number.parseFloat(getComputedStyle(document.documentElement).zoom);
    const coordinateScale = Number.isFinite(documentZoom) && documentZoom > 0 ? documentZoom : 1;
    const clientWidth = document.documentElement.clientWidth / coordinateScale;
    const clientHeight = document.documentElement.clientHeight / coordinateScale;
    const linkRect = link.getBoundingClientRect();
    const linkLeft = linkRect.left / coordinateScale;
    const linkRight = linkRect.right / coordinateScale;
    const linkTop = linkRect.top / coordinateScale;
    const linkHeight = linkRect.height / coordinateScale;
    const headerBottom =
      (document.querySelector<HTMLElement>('[data-app-shell-header]')?.getBoundingClientRect()
        .bottom ?? 0) / coordinateScale;
    const availableRight = clientWidth - linkRight;
    const availableLeft = linkLeft;
    const maximumTooltipHeight = Math.max(
      0,
      clientHeight - headerBottom - 2 * TOOLTIP_VIEWPORT_GUTTER,
    );
    const side =
      availableRight >=
        TOOLTIP_PREFERRED_WIDTH + TOOLTIP_CONNECTOR_WIDTH + TOOLTIP_VIEWPORT_GUTTER ||
      availableRight >= availableLeft
        ? 'right'
        : 'left';
    const availableSide = side === 'right' ? availableRight : availableLeft;
    const width = Math.min(
      TOOLTIP_PREFERRED_WIDTH,
      availableSide - TOOLTIP_CONNECTOR_WIDTH - TOOLTIP_VIEWPORT_GUTTER,
    );
    const linkCenterX = linkLeft + linkRect.width / coordinateScale / 2;
    const makeBottomPlacement = (): TooltipPlacement => {
      const bottomWidth = Math.min(
        TOOLTIP_PREFERRED_WIDTH,
        clientWidth - 2 * TOOLTIP_VIEWPORT_GUTTER,
      );
      const bottomLeft = Math.max(TOOLTIP_VIEWPORT_GUTTER, (clientWidth - bottomWidth) / 2);
      return {
        mode: 'bottom',
        width: bottomWidth,
        left: bottomLeft,
        maxHeight: maximumTooltipHeight,
        connectorOffset: clampConnectorOffset(linkCenterX - bottomLeft, bottomWidth),
      };
    };
    const nextPlacement: TooltipPlacement =
      clientWidth < 768 || width < TOOLTIP_MINIMUM_WIDTH
        ? makeBottomPlacement()
        : (() => {
            const tooltipHeight = tooltip.getBoundingClientRect().height / coordinateScale;
            const minimumTop = Math.max(
              TOOLTIP_VIEWPORT_GUTTER,
              headerBottom + TOOLTIP_VIEWPORT_GUTTER,
            );
            const maximumTop = clientHeight - tooltipHeight - TOOLTIP_VIEWPORT_GUTTER;
            if (maximumTop < minimumTop) return makeBottomPlacement();
            const top = Math.min(
              Math.max(linkTop + linkHeight / 2 - tooltipHeight / 2, minimumTop),
              maximumTop,
            );
            return {
              mode: 'side',
              side,
              width,
              left:
                side === 'right'
                  ? linkRight + TOOLTIP_CONNECTOR_WIDTH
                  : linkLeft - TOOLTIP_CONNECTOR_WIDTH - width,
              top,
              maxHeight: maximumTooltipHeight,
              connectorOffset: clampConnectorOffset(linkTop + linkHeight / 2 - top, tooltipHeight),
            };
          })();
    setTooltipPlacement((current) =>
      sameTooltipPlacement(current, nextPlacement) ? current : nextPlacement,
    );
  }, []);

  useLayoutEffect(() => {
    if (!isDisclosureVisible) return undefined;
    updateTooltipPlacement();
    let frame = 0;
    const schedulePlacementUpdate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateTooltipPlacement);
    };
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedulePlacementUpdate);
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
  }, [isDisclosureVisible, updateTooltipPlacement]);
  useLayoutEffect(() => {
    if (isDisclosureVisible) updateTooltipPlacement();
  }, [isDisclosureVisible, tooltipPlacementMode, tooltipPlacementWidth, updateTooltipPlacement]);

  const tooltipStyle =
    tooltipPlacement?.mode === 'side'
      ? ({
          '--catalog-tooltip-left': `${tooltipPlacement.left}px`,
          '--catalog-tooltip-top': `${tooltipPlacement.top}px`,
          '--catalog-tooltip-width': `${tooltipPlacement.width}px`,
          '--catalog-tooltip-max-height': `${tooltipPlacement.maxHeight}px`,
          '--catalog-tooltip-connector-offset': `${tooltipPlacement.connectorOffset}px`,
        } as CSSProperties)
      : tooltipPlacement
        ? ({
            '--catalog-tooltip-left': `${tooltipPlacement.left}px`,
            '--catalog-tooltip-width': `${tooltipPlacement.width}px`,
            '--catalog-tooltip-max-height': `${tooltipPlacement.maxHeight}px`,
            '--catalog-tooltip-connector-offset': `${tooltipPlacement.connectorOffset}px`,
          } as CSSProperties)
        : undefined;
  const feedbackId = `catalog-course-${course.id}-action-feedback`;
  const actionVisual = courseActionVisual(action.presentation);
  const actionLabel = catalogActionLabel(action.presentation, action.label);
  const ActionIcon = actionVisual.Icon;
  const tooltipPlacementClass =
    tooltipPlacement?.mode === 'side'
      ? tooltipPlacement.side === 'left'
        ? styles.tooltipLeft
        : styles.tooltipRight
      : styles.tooltipBottom;
  const tooltipPlacementName = tooltipPlacement?.mode === 'side' ? tooltipPlacement.side : 'bottom';
  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current !== null) globalThis.clearTimeout(openTimerRef.current);
    openTimerRef.current = null;
  }, []);
  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) globalThis.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);
  const requestTransientPreview = useCallback(() => {
    if (!supportsFinePointer() || hasPinnedDisclosure) return;
    clearCloseTimer();
    if (isDisclosureVisible || openTimerRef.current !== null) return;
    openTimerRef.current = globalThis.setTimeout(() => {
      openTimerRef.current = null;
      onTransientDisclosurePreviewStart(course.id);
    }, DISCLOSURE_OPEN_DELAY);
  }, [
    clearCloseTimer,
    course.id,
    hasPinnedDisclosure,
    isDisclosureVisible,
    onTransientDisclosurePreviewStart,
  ]);
  const requestTransientClose = useCallback(() => {
    clearOpenTimer();
    if (
      !supportsFinePointer() ||
      isDisclosurePinned ||
      !isDisclosureVisible ||
      closeTimerRef.current !== null
    )
      return;
    closeTimerRef.current = globalThis.setTimeout(() => {
      closeTimerRef.current = null;
      onTransientDisclosurePreviewEnd(course.id);
    }, DISCLOSURE_CLOSE_DELAY);
  }, [
    clearOpenTimer,
    course.id,
    isDisclosurePinned,
    isDisclosureVisible,
    onTransientDisclosurePreviewEnd,
  ]);
  const handleCardPointerEnter = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (
        event.target instanceof Element &&
        event.target.closest('[data-part="course-card-actions"]')
      )
        return;
      requestTransientPreview();
    },
    [requestTransientPreview],
  );
  const handleCardPointerLeave = useCallback(() => {
    onTransientDisclosurePreviewExit(course.id);
    requestTransientClose();
  }, [course.id, onTransientDisclosurePreviewExit, requestTransientClose]);
  const handleLinkFocus = useCallback(() => {
    if (!hasPinnedDisclosure) onTransientDisclosurePreviewStart(course.id);
  }, [course.id, hasPinnedDisclosure, onTransientDisclosurePreviewStart]);
  const handleLinkBlur = useCallback(
    (event: FocusEvent<HTMLAnchorElement>) => {
      if (!event.currentTarget.closest('[data-course-card-id]')?.contains(event.relatedTarget))
        onTransientDisclosurePreviewEnd(course.id);
    },
    [course.id, onTransientDisclosurePreviewEnd],
  );
  const handleDisclosurePinToggle = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    onDisclosurePinToggle(course.id);
  }, [clearCloseTimer, clearOpenTimer, course.id, onDisclosurePinToggle]);
  useEffect(() => {
    if (hasPinnedDisclosure) clearOpenTimer();
  }, [clearOpenTimer, hasPinnedDisclosure]);
  useEffect(
    () => () => {
      clearOpenTimer();
      clearCloseTimer();
    },
    [clearCloseTimer, clearOpenTimer],
  );

  return (
    <li className={styles.item}>
      <article
        className={styles.card}
        data-part="course-card"
        data-course-card-id={course.id}
        onPointerEnter={handleCardPointerEnter}
        onPointerLeave={handleCardPointerLeave}
      >
        <Link
          ref={linkRef}
          className={styles.link}
          to={`/courses/${course.id}`}
          aria-label={course.title}
          aria-describedby={isDisclosureVisible ? statusExplanationId : undefined}
          onFocus={handleLinkFocus}
          onBlur={handleLinkBlur}
        >
          <div className={styles.preview} data-part="course-card-preview" />
          <div className={styles.body} data-part="course-card-body">
            <h3 className={styles.title}>{course.title}</h3>
            <div className={styles.metadata} data-part="course-card-metadata">
              <span className={styles.byline}>{course.instructorName}</span>
              <span
                className={styles.metadataSeparator}
                data-part="course-card-metadata-separator"
                aria-hidden="true"
              >
                {' · '}
              </span>
              <span className={styles.lessonCount}>
                {course.totalLessonCount} lesson{course.totalLessonCount === 1 ? '' : 's'}
              </span>
            </div>
          </div>
          <div className={styles.price} data-part="course-card-price">
            <data value={course.price}>{formatCatalogPrice(course.price, course.currency)}</data>
          </div>
        </Link>
        {isDisclosureVisible ? (
          <div
            ref={tooltipRef}
            className={[styles.tooltip, tooltipPlacementClass, styles.tooltipOpen].join(' ')}
            data-placement={tooltipPlacementName}
            id={statusExplanationId}
            role="dialog"
            aria-label={`Course description: ${course.title}`}
            style={tooltipStyle}
            onPointerEnter={clearCloseTimer}
            onPointerLeave={handleCardPointerLeave}
          >
            <div className={styles.tooltipContent} data-part="course-card-tooltip-content">
              {tooltipNotice ? <span className={styles.tooltipNotice}>{tooltipNotice}</span> : null}
              <span className={styles.tooltipCourse}>About {course.title}</span>
              <span className={styles.tooltipDescription}>{description}</span>
            </div>
          </div>
        ) : null}
        <div className={styles.disclosureControl}>
          <Button
            id={`catalog-course-${course.id}-disclosure-trigger`}
            type="button"
            variant="secondary"
            className={styles.disclosureButton}
            aria-controls={statusExplanationId}
            aria-expanded={isDisclosureVisible}
            aria-pressed={isDisclosurePinned}
            onClick={handleDisclosurePinToggle}
            aria-haspopup="dialog"
          >
            <span className={styles.disclosurePill} data-part="course-card-disclosure-pill">
              {previewCue}
            </span>
          </Button>
        </div>
        {action.inCart ? (
          <span className={styles.cartStatus} data-part="course-card-cart-status">
            In cart
          </span>
        ) : null}
        <div className={styles.actions} data-part="course-card-actions">
          {action.kind === 'link' && action.to ? (
            <Link className={styles.actionLink} to={action.to}>
              <span className={styles.actionContent} data-part="course-card-action-content">
                {ActionIcon ? <ActionIcon size={16} aria-hidden="true" /> : null}
                <span>{actionLabel}</span>
              </span>
            </Link>
          ) : action.kind === 'status' ? (
            <span className={styles.actionStatus} data-part="course-card-action-status">
              <span className={styles.actionContent} data-part="course-card-action-content">
                {ActionIcon ? <ActionIcon size={16} aria-hidden="true" /> : null}
                <span>{actionLabel}</span>
              </span>
            </span>
          ) : (
            <Button
              type="button"
              variant={actionVisual.buttonVariant}
              disabled={action.disabled}
              aria-busy={action.pending || undefined}
              aria-describedby={action.feedback ? feedbackId : undefined}
              className={[
                styles.actionButton,
                action.presentation === 'neutral' && styles.actionButtonNeutral,
                action.presentation === 'remove' && styles.actionButtonRemove,
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={onAction}
            >
              <span className={styles.actionContent} data-part="course-card-action-content">
                {ActionIcon ? <ActionIcon size={16} aria-hidden="true" /> : null}
                <span>{actionLabel}</span>
              </span>
            </Button>
          )}
          {action.feedback ? (
            <p id={feedbackId} className={styles.actionFeedback} aria-live="polite">
              {action.feedback.message}
            </p>
          ) : null}
        </div>
      </article>
    </li>
  );
}
