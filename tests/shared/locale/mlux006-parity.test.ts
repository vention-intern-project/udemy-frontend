import registry from '../../../localization/corpus/registry.json';
import { GENERATED_LOCALE_RESOURCES } from '../../../src/shared/locale/generated-resources';
import { createLocaleRuntime } from '../../../src/shared/locale/i18n';

import i18next from 'i18next';
import { describe, expect, it } from 'vitest';

type GeneratedResources = Record<string, Record<string, Record<string, string>>>;

const resources = GENERATED_LOCALE_RESOURCES as GeneratedResources;
const RECORDED_DRAFT37_UNIT_COUNT = 545;
const RECORDED_DRAFT37_OCCURRENCE_COUNT = 768;
const FE_068_UNIT_COUNT = 20;
const INSTRUCTOR_UI_UNIT_COUNT = 9;
const CRF_002_UNIT_IDS = [
  'MLUX-C0544',
  'MLUX-C0545',
  'MLUX-C0546',
  'MLUX-C0547',
  'MLUX-C0548',
  'MLUX-C0549',
  'MLUX-C0550',
  'MLUX-C0551',
  'MLUX-C0552',
  'MLUX-C0553',
] as const;
const CURRENT_CORPUS_UNIT_COUNT =
  RECORDED_DRAFT37_UNIT_COUNT +
  CRF_002_UNIT_IDS.length +
  FE_068_UNIT_COUNT +
  INSTRUCTOR_UI_UNIT_COUNT;
const CURRENT_CORPUS_OCCURRENCE_COUNT =
  RECORDED_DRAFT37_OCCURRENCE_COUNT +
  CRF_002_UNIT_IDS.length +
  FE_068_UNIT_COUNT +
  INSTRUCTOR_UI_UNIT_COUNT;

describe('canonical DRAFT-37 corpus parity', () => {
  it('keeps the exact canonical migration identity and one source-to-runtime owner', () => {
    expect(registry).toMatchObject({
      corpusVersion: 'MLUX-001-DRAFT-37',
      source: { sha256: 'C9E208FC5F1AEF55E709290C67270B79E1CBCE4831E7FBCB20555AB5CF8A73AE' },
      summary: {
        translationUnits: CURRENT_CORPUS_UNIT_COUNT,
        sourceOccurrences: CURRENT_CORPUS_OCCURRENCE_COUNT,
        mergedDuplicateRows: 223,
      },
    });
    expect(registry.exclusions).toHaveLength(12);
    expect(registry.units).toHaveLength(CURRENT_CORPUS_UNIT_COUNT);
    expect(
      registry.units
        .filter((unit) => unit.migrationProvenance.ownerTasks.includes('CRF-002'))
        .map((unit) => unit.id),
    ).toEqual(CRF_002_UNIT_IDS);
  });

  it('binds every active canonical source and plural form to generated EN/RU/UZ resources', () => {
    for (const unit of registry.units) {
      if (unit.unitLifecycle !== 'active') continue;
      for (const locale of ['en', 'ru', 'uz'] as const) {
        const forms = unit.pluralForms?.[locale];
        if (forms) {
          for (const [suffix, value] of Object.entries(forms)) {
            expect(resources[locale]?.[unit.namespace]?.[`${unit.key}_${suffix}`]).toBe(value);
          }
        } else {
          const expected = locale === 'en' ? unit.english : unit.locales[locale].candidate;
          expect(resources[locale]?.[unit.namespace]?.[unit.key]).toBe(expected);
        }
      }
    }
  });

  it('preserves occurrence/source associations and conditional draft provenance', () => {
    const occurrenceIds = registry.units.flatMap((unit) => unit.occurrences.map(({ id }) => id));
    expect(new Set(occurrenceIds).size).toBe(CURRENT_CORPUS_OCCURRENCE_COUNT);
    expect(
      registry.units.every(
        (unit) =>
          unit.sourceRevision.startsWith('sha256:') &&
          unit.locales.ru.sourceRevision === unit.sourceRevision &&
          unit.locales.uz.sourceRevision === unit.sourceRevision,
      ),
    ).toBe(true);
  });

  it('keeps runtime lookup, fallback, interpolation, and plural behavior on generated resources', () => {
    const runtime = createLocaleRuntime('en');
    expect(runtime.t('common:language')).toBe('Language');
    expect(runtime.t('common:language', { lng: 'ru' })).toBe('Язык');
    expect(runtime.t('a11y:localeOption', { language: 'English', lng: 'uz' })).toContain('English');
    expect(runtime.t('instructor:courseEnrollmentsCount', { count: 2, lng: 'ru' })).toContain('2');
    expect(runtime.t('common:missingCanonicalKey')).toBe('Translation unavailable');
  });

  it.each(['ru', 'uz'] as const)(
    'falls back to the real generated EN resource when its %s bundle key is absent',
    (locale) => {
      const unit = registry.units.find(
        (candidate) =>
          candidate.unitLifecycle === 'active' &&
          candidate.pluralForms === null &&
          resources.en[candidate.namespace]?.[candidate.key] === candidate.english &&
          resources[locale][candidate.namespace]?.[candidate.key] ===
            candidate.locales[locale].candidate,
      );
      expect(unit).toBeDefined();
      if (!unit) return;
      const fallbackResources = structuredClone(resources);
      delete fallbackResources[locale][unit.namespace][unit.key];
      const runtime = i18next.createInstance();
      void runtime.init({
        resources: fallbackResources,
        lng: locale,
        fallbackLng: 'en',
        ns: [unit.namespace],
        defaultNS: unit.namespace,
        initAsync: false,
      });
      expect(runtime.t(`${unit.namespace}:${unit.key}`)).toBe(unit.english);
    },
  );
});
