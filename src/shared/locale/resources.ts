import type { Resource } from 'i18next';

import { GENERATED_LOCALE_RESOURCES } from './generated-resources';
import type { Locale } from './types';

export const LOCALE_RESOURCES: Resource & Readonly<Record<Locale, Resource[Locale]>> =
  GENERATED_LOCALE_RESOURCES as Resource & Readonly<Record<Locale, Resource[Locale]>>;
