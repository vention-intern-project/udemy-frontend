import { CircleCheck, ShoppingCart, Trash2, UserPlus, type LucideIcon } from 'lucide-react';

import type { ButtonVariant } from '@shared/ui/primitives';
import { LOCALE_RESOURCES, resolveLocale } from '@shared/locale';

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

export function catalogActionLabelKey(
  presentation: CatalogCourseActionPresentation,
  label: string,
): 'addToCart' | 'enrollFree' | 'notPublished' | null {
  if (
    presentation === 'add-to-cart' &&
    (label === 'Log in to add to cart' || label === 'Add to cart')
  )
    return 'addToCart';
  if (presentation === 'enroll-free' && label === 'Log in to enroll free') return 'enrollFree';
  return presentation === 'neutral' && label === 'Course is not published' ? 'notPublished' : null;
}

export function formatCatalogPrice(
  price: string,
  currency: string,
  locale: string,
  freeLabel = 'FREE',
): string {
  const localizedResources = LOCALE_RESOURCES[resolveLocale({ browserLocales: [locale] })]
    .catalog as Record<string, string>;
  const priceUnavailable = () => localizedResources.priceUnavailable ?? 'Price unavailable';
  if (!DECIMAL_PRICE.test(price) || !CURRENCY_CODE.test(currency)) return priceUnavailable();
  if (/^0(?:\.0+)?$/.test(price)) return freeLabel;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).format(Number(price));
  } catch {
    return priceUnavailable();
  }
}
