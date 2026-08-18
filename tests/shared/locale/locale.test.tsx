// @vitest-environment jsdom

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import {
  createBrowserLocaleStore,
  createLocaleLookup,
  LocaleProvider,
  resolveLocale,
  useLocale,
  type LocaleStorage,
} from '../../../src/shared/locale';

function memoryStorage(initialValues: Record<string, string> = {}): LocaleStorage {
  const values = new Map(Object.entries(initialValues));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

function LocaleProbe() {
  const { locale, setLocale } = useLocale();
  return (
    <>
      <output aria-label="active locale">{locale}</output>
      <button type="button" onClick={() => setLocale('uz')}>
        Set Uzbek
      </button>
    </>
  );
}

describe('locale foundation', () => {
  it('uses a supported saved preference before browser languages and persists the selected locale', async () => {
    const storage = memoryStorage({ 'learnhub.locale': 'ru-RU' });
    const store = createBrowserLocaleStore(storage);

    expect(resolveLocale({ storedLocale: store.get(), browserLocales: ['uz-UZ'] })).toBe('ru');

    const firstRender = render(
      <LocaleProvider store={store}>
        <LocaleProbe />
      </LocaleProvider>,
    );
    expect(screen.getByLabelText('active locale').textContent).toBe('ru');

    await act(async () => {
      await userEvent.setup().click(screen.getByRole('button', { name: 'Set Uzbek' }));
    });
    expect(storage.getItem('learnhub.locale')).toBe('uz');
    expect(screen.getByLabelText('active locale').textContent).toBe('uz');

    firstRender.unmount();
    render(
      <LocaleProvider store={store}>
        <LocaleProbe />
      </LocaleProvider>,
    );
    expect(screen.getByLabelText('active locale').textContent).toBe('uz');
  });

  it('accepts supported browser languages and falls back to English for unsupported values', () => {
    expect(resolveLocale({ browserLocales: ['en-GB'] })).toBe('en');
    expect(resolveLocale({ browserLocales: ['uz-Cyrl-UZ', 'ru-RU'] })).toBe('uz');
    expect(resolveLocale({ browserLocales: ['de-DE', 'fr-FR'] })).toBe('en');
    expect(resolveLocale({ storedLocale: 'not-a-locale', browserLocales: ['ru-RU'] })).toBe('ru');
  });

  it('keeps English as the explicit fallback for missing translated entries', () => {
    const lookup = createLocaleLookup(
      { language: 'Language', logout: 'Log out' },
      { ru: { language: 'Язык' }, uz: { language: 'Til' } },
    );

    expect(lookup.get('language', 'ru')).toBe('Язык');
    expect(lookup.get('logout', 'uz')).toBe('Log out');
    expect(lookup.get('logout', 'en')).toBe('Log out');
  });
});
