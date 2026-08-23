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
    expect(
      registry.units.every(
        ({ locales }) =>
          locales.ru.status === 'draft' &&
          locales.uz.status === 'draft' &&
          locales.ru.reviewerId === null &&
          locales.ru.verdict === null &&
          locales.ru.requestedAt === null &&
          locales.ru.reviewedAt === null &&
          locales.ru.approvalRecordedAt === null &&
          locales.uz.reviewerId === null &&
          locales.uz.verdict === null &&
          locales.uz.requestedAt === null &&
          locales.uz.reviewedAt === null &&
          locales.uz.approvalRecordedAt === null,
      ),
    ).toBe(true);
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
        expect(forms).toBeTruthy();
        for (const [suffix, value] of Object.entries(forms ?? {})) {
          expect(generated[locale]?.[unit.namespace]?.[`${unit.key}_${suffix}`]).toBe(value);
        }
      }
    }
  });
});
