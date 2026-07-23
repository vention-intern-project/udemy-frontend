export const mutationKeys = {
  auth: {
    forgotPassword: ['mutation', 'auth', 'forgot-password'] as const,
    login: ['mutation', 'auth', 'login'] as const,
    resetPassword: ['mutation', 'auth', 'reset-password'] as const,
    signup: ['mutation', 'auth', 'signup'] as const,
  },
} as const;

export function isPrivateQueryForSubject(queryKey: readonly unknown[], subject: string): boolean {
  return queryKey[0] === 'private' && queryKey[1] === subject;
}
