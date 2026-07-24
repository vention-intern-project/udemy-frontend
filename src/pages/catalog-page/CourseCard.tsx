import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import type { CatalogCourse } from '@entities/course';
import { Button } from '@shared/ui/primitives';

const DECIMAL_PRICE = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const CURRENCY_CODE = /^[A-Z]{3}$/;
const TOOLTIP_VIEWPORT_GUTTER = 12;
const TOOLTIP_CONNECTOR_WIDTH = 8;
const TOOLTIP_PREFERRED_WIDTH = 320;
const TOOLTIP_MINIMUM_WIDTH = 220;

type TooltipPlacement =
  | { mode: 'inline' }
  | { mode: 'side'; side: 'left' | 'right'; left: number; top: number; width: number };

interface CourseCardProps { course: CatalogCourse; }

function sameTooltipPlacement(current: TooltipPlacement | null, next: TooltipPlacement): boolean {
  if (!current || current.mode !== next.mode) return false;
  if (current.mode === 'inline' || next.mode === 'inline') return true;
  return current.side === next.side && current.left === next.left && current.top === next.top && current.width === next.width;
}

function formatCatalogPrice(price: string, currency: string): string {
  if (!DECIMAL_PRICE.test(price) || !CURRENCY_CODE.test(currency)) return 'Price unavailable';
  try {
    const currencyMarker = new Intl.NumberFormat('en-US', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
      .formatToParts(0).find((part) => part.type === 'currency')?.value;
    if (!currencyMarker) return 'Price unavailable';
    return /^[\p{L}]+$/u.test(currencyMarker) ? `${currencyMarker}\u00A0${price}` : `${currencyMarker}${price}`;
  } catch { return 'Price unavailable'; }
}

export function CourseCard({ course }: CourseCardProps) {
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
    const link = linkRef.current; const tooltip = tooltipRef.current;
    if (!link || !tooltip) return;
    const clientWidth = document.documentElement.clientWidth; const clientHeight = document.documentElement.clientHeight;
    const linkRect = link.getBoundingClientRect();
    const headerBottom = document.querySelector<HTMLElement>('.app-header')?.getBoundingClientRect().bottom ?? 0;
    const availableRight = clientWidth - linkRect.right; const availableLeft = linkRect.left;
    const side = availableRight >= TOOLTIP_PREFERRED_WIDTH + TOOLTIP_CONNECTOR_WIDTH + TOOLTIP_VIEWPORT_GUTTER || availableRight >= availableLeft ? 'right' : 'left';
    const availableSide = side === 'right' ? availableRight : availableLeft;
    const width = Math.min(TOOLTIP_PREFERRED_WIDTH, availableSide - TOOLTIP_CONNECTOR_WIDTH - TOOLTIP_VIEWPORT_GUTTER);
    const nextPlacement: TooltipPlacement = clientWidth < 768 || width < TOOLTIP_MINIMUM_WIDTH ? { mode: 'inline' } : (() => {
      const tooltipHeight = tooltip.getBoundingClientRect().height;
      const minimumTop = Math.max(TOOLTIP_VIEWPORT_GUTTER, headerBottom + TOOLTIP_VIEWPORT_GUTTER);
      const maximumTop = clientHeight - tooltipHeight - TOOLTIP_VIEWPORT_GUTTER;
      if (maximumTop < minimumTop) return { mode: 'inline' };
      const top = Math.min(Math.max(linkRect.top + (linkRect.height / 2) - (tooltipHeight / 2), minimumTop), maximumTop);
      return { mode: 'side', side, width, left: side === 'right' ? linkRect.right + TOOLTIP_CONNECTOR_WIDTH : linkRect.left - TOOLTIP_CONNECTOR_WIDTH - width, top };
    })();
    setTooltipPlacement((current) => sameTooltipPlacement(current, nextPlacement) ? current : nextPlacement);
  }, []);

  useLayoutEffect(() => {
    if (!tooltipOpen) return undefined;
    updateTooltipPlacement(); let frame = 0;
    const schedulePlacementUpdate = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(updateTooltipPlacement); };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedulePlacementUpdate);
    if (linkRef.current) observer?.observe(linkRef.current);
    if (tooltipRef.current) observer?.observe(tooltipRef.current);
    const visualViewport = window.visualViewport;
    window.addEventListener('resize', schedulePlacementUpdate); visualViewport?.addEventListener('resize', schedulePlacementUpdate);
    visualViewport?.addEventListener('scroll', schedulePlacementUpdate); document.addEventListener('scroll', schedulePlacementUpdate, true);
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); window.removeEventListener('resize', schedulePlacementUpdate); visualViewport?.removeEventListener('resize', schedulePlacementUpdate); visualViewport?.removeEventListener('scroll', schedulePlacementUpdate); document.removeEventListener('scroll', schedulePlacementUpdate, true); };
  }, [tooltipOpen, updateTooltipPlacement]);
  useLayoutEffect(() => { if (tooltipOpen) updateTooltipPlacement(); }, [tooltipOpen, tooltipPlacementMode, tooltipPlacementWidth, updateTooltipPlacement]);

  const tooltipStyle = tooltipPlacement?.mode === 'side' ? {
    '--catalog-tooltip-left': `${tooltipPlacement.left}px`, '--catalog-tooltip-top': `${tooltipPlacement.top}px`, '--catalog-tooltip-width': `${tooltipPlacement.width}px`,
  } as CSSProperties : undefined;
  const actionLabel = !course.isPublished ? 'Not available' : /^0(?:\.0+)?$/.test(course.price) ? 'Enroll Free' : 'Add to cart';
  return <li className="catalog-page__item"><article className="catalog-card"><Link ref={linkRef} className="catalog-card__link" to={`/courses/${course.id}`} aria-label={course.title} aria-describedby={statusExplanationId} onPointerEnter={() => setIsPointerOver(true)} onPointerLeave={() => setIsPointerOver(false)} onFocus={() => setIsLinkFocused(true)} onBlur={() => setIsLinkFocused(false)}><div className="catalog-card__preview"><span className="catalog-card__preview-cue">{previewCue}</span></div><div className="catalog-card__body"><h3 className="catalog-card__title">{course.title}</h3><div className="catalog-card__meta"><span className="catalog-card__byline">{course.instructorName}</span><span className="catalog-card__meta-separator" aria-hidden="true"> · </span><span className="catalog-card__lesson-count">{course.totalLessonCount} lesson{course.totalLessonCount === 1 ? '' : 's'}</span></div></div><span ref={tooltipRef} className={['catalog-card__tooltip', tooltipPlacement?.mode === 'side' ? `catalog-card__tooltip--${tooltipPlacement.side}` : 'catalog-card__tooltip--inline', tooltipOpen && 'catalog-card__tooltip--open'].filter(Boolean).join(' ')} id={statusExplanationId} role="tooltip" style={tooltipStyle}>{tooltipNotice ? <span className="catalog-card__tooltip-notice">{tooltipNotice}</span> : null}<span className="catalog-card__tooltip-course" aria-hidden="true">About {course.title}</span><span className="catalog-card__tooltip-description">{description}</span></span><div className="catalog-card__price"><data value={course.price}>{formatCatalogPrice(course.price, course.currency)}</data></div></Link><div className="catalog-card__actions"><Button type="button" disabled className="catalog-card__action-button">{actionLabel}</Button></div></article></li>;
}
