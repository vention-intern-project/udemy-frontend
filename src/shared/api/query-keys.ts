export type SessionCacheEpoch = string & { readonly __sessionCacheEpoch: unique symbol };

export function isPrivateQueryForEpoch(
  queryKey: readonly unknown[],
  epoch: SessionCacheEpoch,
): boolean {
  return queryKey[0] === 'private' && queryKey[1] === epoch;
}
