import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteAliases } from './config/vite-aliases';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: viteAliases,
  },
});
