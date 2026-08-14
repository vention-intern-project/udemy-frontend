export const authWorkflowMutationKeys = {
  forgotPassword: ['mutation', 'auth', 'forgot-password'] as const,
  login: ['mutation', 'auth', 'login'] as const,
  resetPassword: ['mutation', 'auth', 'reset-password'] as const,
  signup: ['mutation', 'auth', 'signup'] as const,
} as const;
