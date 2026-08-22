import i18next, { type i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { LOCALE_RESOURCES } from './resources';
import { resolveBrowserLocale } from './resolver';
import { SUPPORTED_LOCALES } from './types';

export interface LocaleMissingKeyDiagnostic {
  readonly namespace: string;
  readonly key: string;
}

export interface LocaleRuntimeDiagnostics {
  readonly missingKeys: LocaleMissingKeyDiagnostic[];
}

function initializeLocaleRuntime(
  initialLocale = resolveBrowserLocale(),
  diagnostics: LocaleRuntimeDiagnostics | null = null,
  registerReactSingleton = false,
): i18n {
  const runtime = i18next.createInstance();
  runtime.on('missingKey', (_languages, namespace, key) => {
    if (!diagnostics || !import.meta.env.DEV) return;
    diagnostics.missingKeys.push({ namespace, key });
  });
  if (registerReactSingleton) runtime.use(initReactI18next);
  void runtime.init({
    resources: LOCALE_RESOURCES,
    lng: initialLocale,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LOCALES,
    defaultNS: 'common',
    ns: ['common', 'navigation', 'a11y'],
    interpolation: { escapeValue: false },
    returnEmptyString: false,
    returnNull: false,
    saveMissing: true,
    parseMissingKeyHandler: () => 'Translation unavailable',
    initAsync: false,
  });
  return runtime;
}

export function createLocaleRuntime(
  initialLocale = resolveBrowserLocale(),
  diagnostics: LocaleRuntimeDiagnostics | null = null,
): i18n {
  return initializeLocaleRuntime(initialLocale, diagnostics);
}

export const localeRuntime = initializeLocaleRuntime(undefined, null, true);
