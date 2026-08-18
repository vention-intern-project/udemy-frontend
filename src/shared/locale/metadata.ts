import type { Locale } from './types';

export interface NativeLocaleMetadata {
  readonly code: string;
  readonly nativeLabel: string;
}

export const NATIVE_LOCALE_METADATA: Readonly<Record<Locale, NativeLocaleMetadata>> = {
  en: { code: 'EN', nativeLabel: 'English' },
  ru: { code: 'RU', nativeLabel: 'Русский' },
  uz: { code: 'UZ', nativeLabel: "O'zbek" },
};
