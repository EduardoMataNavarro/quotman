import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Backend and shared unit tests. Angular component tests run through `ng test`.
export default defineConfig({
  resolve: {
    alias: {
      '@backend': fileURLToPath(new URL('./backend', import.meta.url)),
      '@api': fileURLToPath(new URL('./backend/modules', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  test: {
    include: ['backend/**/*.test.ts', 'shared/**/*.test.ts'],
    environment: 'node',
  },
});
