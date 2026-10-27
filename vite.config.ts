/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the site under /<repo>/, so assets must be prefixed with the repo name.
export default defineConfig({
  base: '/pillar-preview-1/',
  plugins: [react()],
  worker: { format: 'es' },
  build: { target: 'es2022', chunkSizeWarningLimit: 8000 },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
