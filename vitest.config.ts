import { defineConfig } from 'vitest/config';
import { viteAliases } from './config/vite-aliases';

export default defineConfig({
  resolve: {
    alias: viteAliases,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
});
