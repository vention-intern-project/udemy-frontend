module.exports = {
  root: true,
  env: {
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  extends: ['eslint:recommended'],
  ignorePatterns: ['dist', 'node_modules', 'playwright-report', 'test-results'],
  overrides: [
    {
      files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}', 'vite.config.ts'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      plugins: ['@typescript-eslint'],
      rules: {
        'no-undef': 'off',
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      },
    },
    {
      files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
      env: { browser: true },
      plugins: ['react-hooks'],
      extends: ['plugin:react-hooks/recommended'],
    },
    {
      files: ['tests/shared/**/*.{ts,tsx}'],
      env: { browser: true, node: true },
    },
    {
      files: ['tests/browser/primitives-harness/**/*.{ts,tsx}'],
      env: { browser: true },
    },
    {
      files: ['tests/browser/primitives.spec.ts'],
      env: { browser: true, node: true },
    },
    {
      files: ['tests/browser/playwright.config.ts', 'tests/browser/primitives-server.ts', 'vite.config.ts'],
      env: { node: true },
    },
    {
      files: ['.eslintrc.cjs'],
      env: { node: true },
      parserOptions: { sourceType: 'script' },
    },
  ],
};
