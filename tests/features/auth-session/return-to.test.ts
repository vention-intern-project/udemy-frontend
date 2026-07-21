import { describe, expect, it } from 'vitest';

import { sanitizeInternalReturnTo } from '../../../src/features/auth-session';

describe('sanitizeInternalReturnTo', () => {
  it('preserves a same-origin path, query, and hash', () => {
    expect(sanitizeInternalReturnTo('/cart?coupon=SAVE#summary', 'https://learnhub.test'))
      .toBe('/cart?coupon=SAVE#summary');
  });

  it.each([
    'https://attacker.test/cart',
    '//attacker.test/cart',
    '/\\attacker.test/cart',
    'javascript:alert(1)',
    'cart',
    '',
  ])('rejects unsafe target %s', (candidate) => {
    expect(sanitizeInternalReturnTo(candidate, 'https://learnhub.test')).toBe(null);
  });
});
