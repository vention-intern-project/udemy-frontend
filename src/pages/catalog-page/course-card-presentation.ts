import { CircleCheck, ShoppingCart, Trash2, UserPlus, type LucideIcon } from 'lucide-react';

import type { ButtonVariant } from '@shared/ui/primitives';

import type { CatalogCourseActionPresentation } from './useCatalogCourseActions';

const DECIMAL_PRICE = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const CURRENCY_CODE = /^[A-Z]{3}$/;

export interface CourseActionVisual {
  Icon: LucideIcon | null;
  buttonVariant: ButtonVariant;
}

export function courseActionVisual(
  presentation: CatalogCourseActionPresentation,
): CourseActionVisual {
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

export function catalogActionLabel(
  presentation: CatalogCourseActionPresentation,
  label: string,
): string {
  if (presentation === 'add-to-cart' && label === 'Log in to add to cart') return 'Add to cart';
  if (presentation === 'enroll-free' && label === 'Log in to enroll free') return 'Enroll free';
  return presentation === 'neutral' && label === 'Course is not published'
    ? 'Not published'
    : label;
}

export function formatCatalogPrice(price: string, currency: string): string {
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
