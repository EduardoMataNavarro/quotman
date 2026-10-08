// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['.wrangler/', 'node_modules/', 'drizzle/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
      // backend/ is self-contained: nothing is imported from the frontend folder.
      'no-restricted-imports': [
        'error',
        { patterns: [{ regex: '(^|/)frontend/', message: 'backend/ never imports from frontend/.' }] },
      ],
    },
  },
);
