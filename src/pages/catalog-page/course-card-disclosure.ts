import { useEffect, useState } from 'react';

export const TOOLTIP_VIEWPORT_GUTTER = 12;
export const TOOLTIP_CONNECTOR_WIDTH = 8;
export const TOOLTIP_PREFERRED_WIDTH = 320;
export const TOOLTIP_MINIMUM_WIDTH = 220;
export const DISCLOSURE_OPEN_DELAY = 280;
export const DISCLOSURE_CLOSE_DELAY = 180;
export const TOOLTIP_CONNECTOR_SAFE_INSET = 24;

export interface CourseCardSidePlacement {
  mode: 'side';
  side: 'left' | 'right';
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  connectorOffset: number;
}

export interface CourseCardBottomPlacement {
  mode: 'bottom';
  left: number;
  width: number;
  maxHeight: number;
  connectorOffset: number;
}

export type CourseCardTooltipPlacement = CourseCardSidePlacement | CourseCardBottomPlacement;

export function clampConnectorOffset(offset: number, size: number): number {
  const safeInset = Math.min(TOOLTIP_CONNECTOR_SAFE_INSET, size / 2);
  return Math.min(Math.max(offset, safeInset), size - safeInset);
}

export function sameTooltipPlacement(
  current: CourseCardTooltipPlacement | null,
  next: CourseCardTooltipPlacement,
): boolean {
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

export function supportsFinePointer(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches
  );
}

export function isCourseCardDisclosureAvailable(): boolean {
  return (
    typeof window === 'undefined' ||
    (window.innerWidth >= 768 &&
      (typeof window.matchMedia !== 'function' ||
        window.matchMedia('(hover: hover) and (pointer: fine)').matches))
  );
}

export function useCourseCardDisclosureAvailability(): boolean {
  const [isAvailable, setIsAvailable] = useState(isCourseCardDisclosureAvailable);
  useEffect(() => {
    const updateAvailability = () => setIsAvailable(isCourseCardDisclosureAvailable());
    const finePointerQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(hover: hover) and (pointer: fine)')
        : null;
    updateAvailability();
    window.addEventListener('resize', updateAvailability);
    finePointerQuery?.addEventListener('change', updateAvailability);
    return () => {
      window.removeEventListener('resize', updateAvailability);
      finePointerQuery?.removeEventListener('change', updateAvailability);
    };
  }, []);
  return isAvailable;
}
