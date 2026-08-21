import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';

import { createLocaleRuntime } from './i18n';
import { createBrowserLocaleStore, normalizeLocale, resolveBrowserLocale } from './resolver';
import type { Locale, LocaleContextValue, LocaleProviderProps, LocaleStore } from './types';

const LocaleStoreContext = createContext<LocaleStore | null>(null);

export function LocaleProvider({
  children,
  initialLocale: providedLocale,
  store,
}: LocaleProviderProps) {
  const browserStore = useMemo(() => store ?? createBrowserLocaleStore(), [store]);
  const [runtime] = useState(() =>
    createLocaleRuntime(providedLocale ?? resolveBrowserLocale(browserStore)),
  );
  return (
    <LocaleStoreContext.Provider value={browserStore}>
      <I18nextProvider i18n={runtime}>{children}</I18nextProvider>
    </LocaleStoreContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const { i18n } = useTranslation();
  const browserStore = useContext(LocaleStoreContext) ?? createBrowserLocaleStore();
  const locale = normalizeLocale(i18n.resolvedLanguage ?? i18n.language) ?? 'en';
  const setLocale = useCallback(
    (nextLocale: Locale) => {
      browserStore.set(nextLocale);
      void i18n.changeLanguage(nextLocale);
    },
    [browserStore, i18n],
  );
  return { locale, setLocale };
}
