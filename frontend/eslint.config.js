// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', '.angular/', '.wrangler/', 'node_modules/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
      // frontend/ is self-contained: it talks to the backend over HTTP / the API binding,
      // never by importing its code.
      'no-restricted-imports': [
        'error',
        { patterns: [{ regex: '(^|/)backend/', message: 'frontend/ never imports from backend/.' }] },
      ],
    },
  },
);
