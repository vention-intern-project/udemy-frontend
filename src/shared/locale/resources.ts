import type { Resource } from 'i18next';

import { GENERATED_LOCALE_RESOURCES } from './generated-resources';
import type { Locale } from './types';

export const LOCALE_RESOURCES = GENERATED_LOCALE_RESOURCES satisfies Resource &
  Readonly<Record<Locale, Resource[Locale]>>;
