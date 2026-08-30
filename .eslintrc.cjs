const privateAliasEntryPatterns = [
  '@app/*/*',
  '@pages/*/*',
  '@widgets/*/*',
  '@features/*/*',
  '@entities/*/*',
  '@shared/*/*/*',
];

function restrictedAliasImports(patterns) {
  return ['error', { patterns: [...privateAliasEntryPatterns, ...patterns] }];
}

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
      files: [
        'src/**/*.{ts,tsx}',
        'tests/**/*.{ts,tsx}',
        'config/**/*.ts',
        'vite.config.ts',
        'vitest.config.ts',
      ],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: __dirname,
      },
      plugins: ['@typescript-eslint', 'import'],
      rules: {
        'no-undef': 'off',
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/consistent-type-imports': 'error',
        '@typescript-eslint/await-thenable': 'error',
        '@typescript-eslint/no-floating-promises': [
          'error',
          { ignoreVoid: true, ignoreIIFE: false },
        ],
        '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
        'import/no-cycle': 'error',
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
      files: [
        'tests/browser/playwright.config.ts',
        'tests/browser/primitives-server.ts',
        'config/**/*.ts',
        'vite.config.ts',
        'vitest.config.ts',
      ],
      env: { node: true },
    },
    {
      files: [
        'tests/features/cart-workflow/api.test.ts',
        'tests/integration/mocks/mock-api.test.ts',
        'tests/shared/api/client.test.ts',
        'tests/shared/api/tanstack-boundary.test.tsx',
      ],
      rules: {
        '@typescript-eslint/consistent-type-imports': 'off',
      },
    },
    {
      files: ['.eslintrc.cjs', 'stylelint.config.cjs'],
      env: { node: true },
      parserOptions: { sourceType: 'script' },
    },
    {
      files: [
        'scripts/quality/**/*.{mjs,ts}',
        'scripts/localization/**/*.{mjs,ts}',
        'tests/quality/**/*.{mjs,ts}',
      ],
      env: { node: true },
      plugins: ['import'],
      rules: {
        'import/no-cycle': 'error',
      },
    },
    {
      files: ['src/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': restrictedAliasImports([]),
      },
    },
    {
      files: ['src/pages/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': restrictedAliasImports(['@app/**']),
      },
    },
    {
      files: ['src/widgets/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': restrictedAliasImports(['@app/**', '@pages/**']),
      },
    },
    {
      files: ['src/features/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': restrictedAliasImports(['@app/**', '@pages/**', '@widgets/**']),
      },
    },
    {
      files: ['src/entities/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': restrictedAliasImports([
          '@app/**',
          '@pages/**',
          '@widgets/**',
          '@features/**',
        ]),
      },
    },
    {
      files: ['src/shared/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': restrictedAliasImports([
          '@app/**',
          '@pages/**',
          '@widgets/**',
          '@features/**',
          '@entities/**',
        ]),
      },
    },
  ],
};
