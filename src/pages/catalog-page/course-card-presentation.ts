import { CircleCheck, ShoppingCart, Trash2, UserPlus, type LucideIcon } from 'lucide-react';

import type { ButtonVariant } from '@shared/ui/primitives';
import { LOCALE_RESOURCES, formatLocaleCurrency, resolveLocale } from '@shared/locale';

import type { CatalogCourseActionPresentation } from './useCatalogCourseActions';

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

export function formatCatalogPrice(
  price: string,
  currency: string,
  locale: string,
  freeLabel = 'FREE',
): string {
  const localizedResources = LOCALE_RESOURCES[resolveLocale({ browserLocales: [locale] })]
    .catalog as Record<string, string>;
  return formatLocaleCurrency({
    price,
    currency,
    locale,
    freeLabel,
    unavailableLabel: localizedResources.priceUnavailable ?? 'Price unavailable',
  });
}
