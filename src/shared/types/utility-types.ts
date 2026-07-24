export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type Maybe<T> = T | null | undefined;

export type NonEmptyArray<T> = readonly [T, ...T[]];

export function isNonEmptyArray<T>(value: readonly T[]): value is NonEmptyArray<T> {
  return value.length > 0;
}
