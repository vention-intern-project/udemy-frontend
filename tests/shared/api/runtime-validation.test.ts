import { describe, expect, it } from 'vitest';

import {
  readBoolean, readNonNegativeInteger, readNullableString, readPositiveInteger, readRecord, readString,
} from '../../../src/shared/api';

describe('shared transport runtime validation', () => {
  it('narrows only the supported transport primitives', () => {
    expect(readRecord({ id: 1 }, 'cart response')).toEqual({ id: 1 });
    expect(readString('USD', 'cart currency')).toBe('USD');
    expect(readNullableString(null, 'course description')).toBeNull();
    expect(readPositiveInteger(1, 'lesson id')).toBe(1);
    expect(readNonNegativeInteger(0, 'page total')).toBe(0);
    expect(readBoolean(true, 'lesson published')).toBe(true);
  });

  it.each([
    [() => readRecord([], 'cart response'), 'cart response'],
    [() => readString(null, 'cart currency'), 'cart currency'],
    [() => readNullableString(7, 'course description'), 'course description'],
    [() => readPositiveInteger(0, 'lesson id'), 'lesson id'],
    [() => readNonNegativeInteger(-1, 'page total'), 'page total'],
    [() => readBoolean('true', 'lesson published'), 'lesson published'],
  ])('rejects malformed transport values with their boundary context', (read, context) => {
    expect(read).toThrow(`Invalid response ${context}`);
  });
});
