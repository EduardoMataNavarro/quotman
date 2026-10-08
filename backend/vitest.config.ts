import { defineConfig } from 'vitest/config';

// Unit tests (fakes) and integration tests (the real API on PGlite with the migrations).
export default defineConfig({
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
