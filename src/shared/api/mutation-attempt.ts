const mutationAttemptIdentityBrand: unique symbol = Symbol('MutationAttemptIdentity');

export interface MutationAttemptIdentity {
  readonly [mutationAttemptIdentityBrand]: true;
}

const mutationAttemptKeys = new WeakMap<MutationAttemptIdentity, string>();
let nextMutationAttempt = 0;

export function createMutationAttemptIdentity(): MutationAttemptIdentity {
  nextMutationAttempt += 1;
  const identity: MutationAttemptIdentity = Object.freeze({
    [mutationAttemptIdentityBrand]: true as const,
  });
  mutationAttemptKeys.set(identity, `attempt-${nextMutationAttempt}`);
  return identity;
}

export function mutationAttemptKey(identity: MutationAttemptIdentity): string {
  const key = mutationAttemptKeys.get(identity);
  if (key === undefined) {
    throw new TypeError(
      'Mutation attempt identity must be created by createMutationAttemptIdentity',
    );
  }
  return key;
}
