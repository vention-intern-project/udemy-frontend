import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { createBrowserLocaleStore, resolveBrowserLocale } from './resolver';
import type { Locale, LocaleContextValue, LocaleProviderProps, LocaleStore } from './types';

const LocaleContext = createContext<LocaleContextValue | null>(null);

LocaleContext.displayName = 'LocaleContext';

function initialLocale(store: LocaleStore, providedLocale: Locale | undefined): Locale {
  return providedLocale ?? resolveBrowserLocale(store);
}

export function LocaleProvider({
  children,
  initialLocale: providedLocale,
  store,
}: LocaleProviderProps) {
  const browserStore = useMemo(() => store ?? createBrowserLocaleStore(), [store]);
  const [locale, setLocaleState] = useState(() => initialLocale(browserStore, providedLocale));

  const setLocale = useCallback(
    (nextLocale: Locale) => {
      browserStore.set(nextLocale);
      setLocaleState(nextLocale);
    },
    [browserStore],
  );

  const value = useMemo<LocaleContextValue>(() => ({ locale, setLocale }), [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (context === null) {
    throw new Error('useLocale must be used within a LocaleProvider.');
  }
  return context;
}
