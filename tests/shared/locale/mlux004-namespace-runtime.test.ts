import registry from '../../../localization/corpus/registry.json';
import { createLocaleRuntime } from '../../../src/shared/locale/i18n';

import { describe, expect, it } from 'vitest';

describe('canonical locale namespace runtime', () => {
  it.each(['en', 'ru', 'uz'] as const)(
    'resolves every active non-plural registry key through the %s runtime',
    (locale) => {
      const runtime = createLocaleRuntime(locale);
      for (const unit of registry.units.filter(
        (candidate) => candidate.unitLifecycle === 'active' && candidate.pluralForms === null,
      )) {
        const key = `${unit.namespace}:${unit.key}`;
        const interpolation = Object.fromEntries(
          unit.placeholdersByLocale[locale].map((placeholder) => [placeholder, placeholder]),
        );
        const expected = (locale === 'en' ? unit.english : unit.locales[locale].candidate).replace(
          /\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*}}/g,
          (_match, placeholder: string) => placeholder,
        );
        expect(runtime.t(key, interpolation), `${locale} ${unit.id}`).toBe(expected);
      }
    },
  );

  it.each(['en', 'ru', 'uz'] as const)(
    'resolves every canonical plural key through the %s runtime',
    (locale) => {
      const runtime = createLocaleRuntime(locale);
      for (const unit of registry.units.filter(
        (candidate) => candidate.unitLifecycle === 'active' && candidate.pluralForms !== null,
      )) {
        const key = `${unit.namespace}:${unit.key}`;
        for (const count of [1, 2, 5]) {
          const value = runtime.t(key, { count });
          expect(value, `${locale} ${unit.id} ${count}`).not.toBe(key);
          expect(value).not.toContain('{{count}}');
          const renderedForms = Object.values(unit.pluralForms?.[locale] ?? {}).map((form) =>
            form.split('{{count}}').join(String(count)),
          );
          expect(renderedForms).toContain(value);
        }
      }
    },
  );

  it('keeps representative source occurrences attached to the canonical registry', () => {
    const contexts = registry.units.flatMap((unit) =>
      unit.occurrences.map(({ context }) => context),
    );
    expect(contexts).toContain('AccountMenu aria-label');
    expect(contexts.some((context) => context.includes('Catalog'))).toBe(true);
    expect(contexts.some((context) => context.includes('Lesson'))).toBe(true);
  });
});
