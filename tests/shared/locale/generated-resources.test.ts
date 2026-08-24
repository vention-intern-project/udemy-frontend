import registry from '../../../localization/corpus/registry.json';
import { GENERATED_LOCALE_RESOURCES } from '../../../src/shared/locale/generated-resources';

import { describe, expect, it } from 'vitest';

const generated = GENERATED_LOCALE_RESOURCES as Record<
  string,
  Record<string, Record<string, string>>
>;

describe('generated canonical localization resources', () => {
  it('binds the committed canonical registry to exact DRAFT-37 migration facts', () => {
    expect(registry).toMatchObject({
      corpusVersion: 'MLUX-001-DRAFT-37',
      source: { sha256: 'C9E208FC5F1AEF55E709290C67270B79E1CBCE4831E7FBCB20555AB5CF8A73AE' },
      summary: { translationUnits: 523, sourceOccurrences: 746, mergedDuplicateRows: 223 },
    });
    expect(registry.exclusions).toHaveLength(12);
    expect(registry.units).toHaveLength(523);
    for (const { locales } of registry.units) {
      for (const locale of [locales.ru, locales.uz]) {
        if (locale.status !== 'draft') continue;
        expect(locale.reviewerId).toBeNull();
        expect(locale.verdict).toBeNull();
        expect(locale.requestedAt).toBeNull();
        expect(locale.reviewedAt).toBeNull();
        expect(locale.approvalRecordedAt).toBeNull();
      }
    }
  });

  it('contains active draft candidates without approval metadata and preserves generated keys', () => {
    expect(generated.en.common.language).toBe('Language');
    expect(generated.ru.common.language).toBe('Язык');
    expect(generated.uz.common.language).toBe('Til');
    expect(JSON.stringify(GENERATED_LOCALE_RESOURCES)).not.toContain('approvalRecordedAt');
    expect(JSON.stringify(GENERATED_LOCALE_RESOURCES)).not.toContain('review_requested');
    expect(JSON.stringify(GENERATED_LOCALE_RESOURCES)).not.toContain('unitLifecycle');
    expect(generated.en.instructor.courseEnrollmentsCount_one).toContain('{{count}}');
  });

  it('emits every canonical plural form for all four plural units without lifecycle metadata', () => {
    const pluralUnits = registry.units.filter(({ pluralForms }) => pluralForms !== null);
    expect(pluralUnits).toHaveLength(4);
    for (const unit of pluralUnits) {
      for (const locale of ['en', 'ru', 'uz'] as const) {
        const forms = unit.pluralForms?.[locale];
        expect(Object.keys(forms ?? {})).not.toHaveLength(0);
        for (const [suffix, value] of Object.entries(forms ?? {})) {
          expect(generated[locale]?.[unit.namespace]?.[`${unit.key}_${suffix}`]).toBe(value);
        }
      }
    }
  });
});
