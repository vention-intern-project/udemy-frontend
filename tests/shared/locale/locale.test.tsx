// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import {
  createBrowserLocaleStore,
  createLocaleLookup,
  createLocaleRuntime,
  getBrowserLocales,
  normalizeLocale,
  resolveLocale,
  syncLocaleResources,
} from '../../../src/shared/locale';

describe('locale runtime backed by generated canonical resources', () => {
  it('normalizes and resolves supported browser preferences', () => {
    expect(normalizeLocale('ru-RU')).toBe('ru');
    expect(resolveLocale({ browserLocales: ['uz-UZ', 'en-US'] })).toBe('uz');
    expect(getBrowserLocales().length).toBeGreaterThan(0);
  });

  it('persists the selected locale and translates with EN fallback', () => {
    const values = new Map<string, string>();
    const store = createBrowserLocaleStore({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    });
    expect(store.set('ru')).toBe(true);
    expect(store.get()).toBe('ru');
    const runtime = createLocaleRuntime('ru');
    expect(runtime.t('common:language')).toBe('Язык');
    expect(runtime.t('common:unknownGeneratedKey')).toBe('Translation unavailable');
  });

  it('removes the persisted locale without throwing when storage removal fails', () => {
    const values = new Map<string, string>([['learnhub.locale', 'ru']]);
    const store = createBrowserLocaleStore({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    });

    expect(store.remove()).toBe(true);
    expect(store.get()).toBeNull();

    const throwingStore = createBrowserLocaleStore({
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => {
        throw new Error('removal denied');
      },
    });
    expect(throwingStore.remove()).toBe(false);
  });

  it('offers a typed lookup from the generated resource owner', () => {
    const lookup = createLocaleLookup(
      { language: 'Language' },
      { ru: { language: 'Язык' }, uz: { language: 'Til' } },
    );
    expect(lookup.get('language', 'uz')).toBe('Til');
  });

  it('replaces live locale bundles and notifies React consumers after a resource update', () => {
    const runtime = createLocaleRuntime('en');
    runtime.addResource('en', 'course', 'staleKey', 'Stale value');
    const languageChanged = vi.fn();
    runtime.on('languageChanged', languageChanged);

    syncLocaleResources(runtime, {
      en: { course: { refreshedKey: 'Fresh value' } },
      ru: { course: { refreshedKey: 'Новое значение' } },
      uz: { course: { refreshedKey: 'Yangi qiymat' } },
    });

    expect(runtime.t('course:refreshedKey')).toBe('Fresh value');
    expect(runtime.exists('course:staleKey')).toBe(false);
    expect(languageChanged).toHaveBeenCalledWith('en');
  });
});
