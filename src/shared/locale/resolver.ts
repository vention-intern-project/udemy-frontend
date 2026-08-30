import type {
  EnglishLocaleCatalog,
  Locale,
  LocaleLookup,
  LocaleResolverInput,
  LocaleStorage,
  LocaleStore,
  LocaleTranslations,
} from './types';

export const LOCALE_STORAGE_KEY = 'learnhub.locale';

interface BrowserLanguagePreferences {
  readonly languages?: readonly string[];
  readonly language?: string;
}

export function normalizeLocale(value: unknown): Locale | undefined {
  if (typeof value !== 'string') return undefined;
  const language = value.trim().toLowerCase().split(/[-_]/, 1)[0];
  if (language === 'en' || language === 'ru' || language === 'uz') return language;
  return undefined;
}

export function resolveLocale({ storedLocale, browserLocales = [] }: LocaleResolverInput): Locale {
  const savedLocale = normalizeLocale(storedLocale);
  if (savedLocale) return savedLocale;

  for (const browserLocale of browserLocales) {
    const locale = normalizeLocale(browserLocale);
    if (locale) return locale;
  }

  return 'en';
}

export function getBrowserLocales(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  const preferences = navigator as BrowserLanguagePreferences;
  if (preferences.languages?.length) return preferences.languages;
  return typeof preferences.language === 'string' ? [preferences.language] : [];
}

export function createBrowserLocaleStore(
  storage?: LocaleStorage,
  storageKey = LOCALE_STORAGE_KEY,
): LocaleStore {
  function browserStorage(): LocaleStorage {
    const candidate = storage ?? globalThis.localStorage;
    if (!candidate) throw new Error('localStorage is unavailable');
    return candidate;
  }

  return {
    get() {
      try {
        return normalizeLocale(browserStorage().getItem(storageKey)) ?? null;
      } catch {
        return null;
      }
    },
    set(locale) {
      try {
        browserStorage().setItem(storageKey, locale);
        return true;
      } catch {
        return false;
      }
    },
    remove() {
      try {
        browserStorage().removeItem(storageKey);
        return true;
      } catch {
        return false;
      }
    },
  };
}

export function resolveBrowserLocale(store = createBrowserLocaleStore()): Locale {
  return resolveLocale({ storedLocale: store.get(), browserLocales: getBrowserLocales() });
}

export function createLocaleLookup<TKey extends string>(
  englishCatalog: EnglishLocaleCatalog<TKey>,
  translations: LocaleTranslations<TKey>,
): LocaleLookup<TKey> {
  return {
    get(key, locale) {
      if (locale === 'en') return englishCatalog[key];
      return translations[locale]?.[key] ?? englishCatalog[key];
    },
  };
}
