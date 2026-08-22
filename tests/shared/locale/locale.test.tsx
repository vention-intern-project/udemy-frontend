// @vitest-environment jsdom

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import {
  createBrowserLocaleStore,
  createLocaleRuntime,
  createLocaleLookup,
  localeRuntime,
  LocaleProvider,
  MLUX_006_FOLLOWUP_RUNTIME_MAPPING,
  MLUX_002_RUNTIME_MAPPING,
  resolveLocale,
  useLocale,
  type LocaleStorage,
  type LocaleRuntimeDiagnostics,
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

  it('runs only the approved locales with immutable English fallback and actionable missing-key output', () => {
    const diagnostics: LocaleRuntimeDiagnostics = { missingKeys: [] };
    diagnostics.missingKeys.push({ namespace: 'test', key: 'direct-diagnostic-contract' });
    const runtime = createLocaleRuntime('ru', diagnostics);

    expect((runtime.options.supportedLngs || []).filter((locale) => locale !== 'cimode')).toEqual([
      'en',
      'ru',
      'uz',
    ]);
    expect(runtime.options.fallbackLng).toEqual(['en']);
    expect(runtime.t('common:language')).toBe('Язык');
    expect(runtime.t('common:not-a-real-key')).toBe('Translation unavailable');
    expect(diagnostics.missingKeys).toContainEqual({ namespace: 'common', key: 'not-a-real-key' });
    expect(diagnostics.missingKeys).toContainEqual({
      namespace: 'test',
      key: 'direct-diagnostic-contract',
    });
  });

  it('keeps the exported runtime stable when a provider initializes its own locale', async () => {
    await localeRuntime.changeLanguage('en');

    render(
      <LocaleProvider initialLocale="ru">
        <LocaleProbe />
      </LocaleProvider>,
    );

    expect(screen.getByLabelText('active locale').textContent).toBe('ru');
    expect(localeRuntime.language).toBe('en');
    expect(document.documentElement.lang).toBe('ru');
  });

  it('provides the canonical MLUX-C0369 logout copy in every supported locale', () => {
    const runtime = createLocaleRuntime('en');
    const mapping = MLUX_002_RUNTIME_MAPPING.find(({ unitId }) => unitId === 'MLUX-C0369');

    expect(mapping).toMatchObject({
      namespace: 'auth',
      key: 'logOut',
      english: 'Log out',
      occurrences: [
        {
          id: 'O0521',
          context: 'src/app/layouts/AccountMenu.tsx:219 — AppShell / authenticated account menu',
        },
      ],
    });
    expect({
      en: runtime.getResource('en', 'auth', 'logOut'),
      ru: runtime.getResource('ru', 'auth', 'logOut'),
      uz: runtime.getResource('uz', 'auth', 'logOut'),
    }).toEqual({ en: 'Log out', ru: 'Выйти', uz: 'Chiqish' });
  });

  it('provides the canonical account-role labels in every supported locale', () => {
    const runtime = createLocaleRuntime('en');

    expect(MLUX_006_FOLLOWUP_RUNTIME_MAPPING).toMatchObject([
      {
        unitId: 'MLUX-C0285',
        namespace: 'auth',
        key: 'student',
        english: 'Student',
        occurrences: [{ id: 'O0707' }],
      },
      {
        unitId: 'MLUX-C0164',
        namespace: 'course',
        key: 'instructor',
        english: 'Instructor',
        occurrences: [{ id: 'O0708' }],
      },
      {
        unitId: 'MLUX-C0286',
        namespace: 'auth',
        key: 'admin',
        english: 'Admin',
        occurrences: [{ id: 'O0709' }],
      },
    ]);
    expect({
      en: [
        runtime.getResource('en', 'auth', 'student'),
        runtime.getResource('en', 'course', 'instructor'),
        runtime.getResource('en', 'auth', 'admin'),
      ],
      ru: [
        runtime.getResource('ru', 'auth', 'student'),
        runtime.getResource('ru', 'course', 'instructor'),
        runtime.getResource('ru', 'auth', 'admin'),
      ],
      uz: [
        runtime.getResource('uz', 'auth', 'student'),
        runtime.getResource('uz', 'course', 'instructor'),
        runtime.getResource('uz', 'auth', 'admin'),
      ],
    }).toEqual({
      en: ['Student', 'Instructor', 'Admin'],
      ru: ['Студент', 'Преподаватель', 'Администратор'],
      uz: ['Talaba', 'O‘qituvchi', 'Administrator'],
    });
  });

  it('keeps the independently enumerated DRAFT-11 allocation, resource review state and occurrences complete', () => {
    const runtime = createLocaleRuntime('en');
    const foundationMapping = MLUX_002_RUNTIME_MAPPING.filter(
      ({ unitId }) => unitId !== 'MLUX-C0369',
    );
    const expectedIds = [
      'MLUX-C0001',
      'MLUX-C0002',
      'MLUX-C0003',
      'MLUX-C0004',
      'MLUX-C0005',
      'MLUX-C0006',
      'MLUX-C0007',
      'MLUX-C0008',
      'MLUX-C0009',
      'MLUX-C0010',
      'MLUX-C0011',
      'MLUX-C0012',
      'MLUX-C0013',
      'MLUX-C0014',
      'MLUX-C0015',
      'MLUX-C0016',
      'MLUX-C0017',
      'MLUX-C0018',
      'MLUX-C0019',
      'MLUX-C0020',
      'MLUX-C0021',
      'MLUX-C0022',
      'MLUX-C0023',
    ];

    expect(foundationMapping.map((mapping) => mapping.unitId)).toEqual(expectedIds);
    expect(foundationMapping.flatMap((mapping) => mapping.occurrences)).toHaveLength(33);
    expect(
      foundationMapping
        .flatMap((mapping) => mapping.occurrences)
        .map(({ id }) => id)
        .sort(),
    ).toEqual(Array.from({ length: 33 }, (_, index) => `O${String(index + 1).padStart(4, '0')}`));
    for (const mapping of foundationMapping) {
      expect(mapping.unitId).toMatch(/^MLUX-C\d{4}$/);
      expect(mapping.key).not.toMatch(/^MLUX-/);
      expect(mapping.resourceStatus).toBe('Draft');
      expect(mapping.russian).toEqual({ resource: 'Draft', review: 'Pending' });
      expect(mapping.uzbek).toEqual({ resource: 'Draft', review: 'Pending' });
      expect(mapping.ownerTask).toBe('MLUX-002');
      expect(runtime.exists(`${mapping.namespace}:${mapping.key}`)).toBe(true);
    }
  });
});
