import registry from '../../../localization/corpus/registry.json';
import { GENERATED_LOCALE_RESOURCES } from '../../../src/shared/locale/generated-resources';

import { describe, expect, it } from 'vitest';

type GeneratedResources = Record<string, Record<string, Record<string, string>>>;

const generatedResources = GENERATED_LOCALE_RESOURCES as GeneratedResources;
const CURRENT_CORPUS_OCCURRENCE_COUNT = 757;

function placeholders(value: string): readonly string[] {
  return [...value.matchAll(/\{\{?\s*([A-Za-z][A-Za-z0-9_]*)\s*}}?/g)]
    .map((match) => match[1])
    .sort();
}

describe('canonical registry source parity', () => {
  it('contains unique unit, semantic, and occurrence identities without a projection copy', () => {
    expect(new Set(registry.units.map(({ id }) => id)).size).toBe(registry.units.length);
    expect(new Set(registry.units.map(({ namespace, key }) => `${namespace}:${key}`)).size).toBe(
      registry.units.length,
    );
    expect(
      new Set(registry.units.flatMap((unit) => unit.occurrences.map(({ id }) => id))).size,
    ).toBe(CURRENT_CORPUS_OCCURRENCE_COUNT);
  });

  it('keeps every source occurrence attached to one canonical unit and current revision', () => {
    const occurrences = registry.units.flatMap((unit) =>
      unit.occurrences.map((occurrence) => ({ unit, occurrence })),
    );

    expect(occurrences).toHaveLength(registry.summary.sourceOccurrences);
    expect(new Set(occurrences.map(({ occurrence }) => occurrence.id)).size).toBe(
      occurrences.length,
    );
    for (const { unit, occurrence } of occurrences) {
      expect(occurrence.id).toMatch(/^(MLUX-O\d{4}|MLUX-003-SO\d{3})$/);
      expect(occurrence.context.trim()).not.toBe('');
      expect(unit.sourceRevision).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(unit.locales.ru.sourceRevision).toBe(unit.sourceRevision);
      expect(unit.locales.uz.sourceRevision).toBe(unit.sourceRevision);
    }
  });

  it('keeps every locale placeholder and plural contract aligned to generated text', () => {
    for (const unit of registry.units.filter((candidate) => candidate.unitLifecycle === 'active')) {
      for (const locale of ['en', 'ru', 'uz'] as const) {
        const expectedPlaceholders = [...unit.placeholdersByLocale[locale]].sort();
        const forms = unit.pluralForms?.[locale];
        const values = forms
          ? Object.entries(forms).map(
              ([suffix, value]) => [`${unit.key}_${suffix}`, value] as const,
            )
          : [[unit.key, locale === 'en' ? unit.english : unit.locales[locale].candidate] as const];

        for (const [key, value] of values) {
          expect(placeholders(value)).toEqual(expectedPlaceholders);
          expect(generatedResources[locale]?.[unit.namespace]?.[key]).toBe(value);
        }
      }
    }
  });

  it('keeps generated resources free of registry lifecycle and approval metadata', () => {
    const serialized = JSON.stringify(GENERATED_LOCALE_RESOURCES);
    expect(serialized).not.toContain('approvalAuthority');
    expect(serialized).not.toContain('sourceRevision');
    expect(serialized).not.toContain('migrationProvenance');
  });
});
