// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/** Backend layers the frontend may import: pure TypeScript + zod contracts (PLAN.md §8.1). */
const FRONTEND_SAFE_LAYERS = 'dto|enum|type';

export default tseslint.config(
  { ignores: ['dist/', '.angular/', '.wrangler/', 'node_modules/', 'drizzle/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
    },
  },
  {
    // The Angular app. The Worker entry (server.ts, server-logic.ts) is Worker code and
    // may reach the backend.
    files: ['src/**/*.ts'],
    ignores: ['src/server.ts', 'src/server-logic.ts', 'src/server-logic.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: `^@api/(?!.+\\.(${FRONTEND_SAFE_LAYERS})$)`,
              message: `The frontend may only import backend ${FRONTEND_SAFE_LAYERS.replaceAll('|', ', ')} files, e.g. '@api/catalog/catalog.dto'.`,
            },
            {
              regex: '^@backend/|(^|/)backend/',
              message: "Import backend contracts through '@api/<module>/<module>.(dto|enum|type)'.",
            },
          ],
        },
      ],
    },
  },
);
