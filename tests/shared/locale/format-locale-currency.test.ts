import { describe, expect, it } from 'vitest';

import { formatLocaleCurrency } from '../../../src/shared/locale';

describe('formatLocaleCurrency', () => {
  it.each([
    ['en-US', '$19.99'],
    ['ru-RU', '19,99\u00a0$'],
    ['uz-UZ', '19,99\u00a0$'],
  ])('formats a paid USD amount with native %s presentation', (locale, expected) => {
    expect(
      formatLocaleCurrency({
        price: '19.99',
        currency: 'USD',
        locale,
        freeLabel: 'Free',
        unavailableLabel: 'Price unavailable',
      }),
    ).toBe(expected);
  });

  it('preserves free and invalid-price fallbacks without rewriting API values', () => {
    expect(
      formatLocaleCurrency({
        price: '0.00',
        currency: 'USD',
        locale: 'ru-RU',
        freeLabel: 'Бесплатно',
        unavailableLabel: 'Цена недоступна',
      }),
    ).toBe('Бесплатно');
    expect(
      formatLocaleCurrency({
        price: 'not-a-decimal',
        currency: 'USD',
        locale: 'ru-RU',
        freeLabel: 'Бесплатно',
        unavailableLabel: 'Цена недоступна',
      }),
    ).toBe('Цена недоступна');
  });

  it('retains an exact server amount when locale formatting a large decimal value', () => {
    expect(
      formatLocaleCurrency({
        price: '1000000000000000000000019.0001',
        currency: 'USD',
        locale: 'en-US',
      }),
    ).toBe('$1,000,000,000,000,000,000,000,019.0001');
  });
});
