import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  isNonEmptyArray,
  type Maybe,
  type NonEmptyArray,
  type Nullable,
  type Optional,
} from '@shared/types';

describe('shared utility type contracts', () => {
  it('keeps null and undefined aliases semantically distinct', () => {
    expectTypeOf<Nullable<string>>().toEqualTypeOf<string | null>();
    expectTypeOf<Optional<string>>().toEqualTypeOf<string | undefined>();
    expectTypeOf<Maybe<string>>().toEqualTypeOf<string | null | undefined>();
  });

  it('narrows readonly arrays to an immutable non-empty tuple', () => {
    const values: readonly number[] = [1, 2];

    if (!isNonEmptyArray(values)) throw new Error('Expected a non-empty array');

    expectTypeOf(values).toEqualTypeOf<NonEmptyArray<number>>();
    expectTypeOf<NonEmptyArray<number>>().toMatchTypeOf<readonly number[]>();
    expect(values[0]).toBe(1);
  });

  it('returns true only for non-empty arrays', () => {
    expect(isNonEmptyArray([])).toBe(false);
    expect(isNonEmptyArray(['course'])).toBe(true);
    expect(isNonEmptyArray(Object.freeze(['lesson']))).toBe(true);
  });
});
