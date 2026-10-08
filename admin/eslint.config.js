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
      // admin/ is self-contained: it talks to the backend over HTTP, never by importing it.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { regex: '(^|/)(backend|frontend)/', message: 'admin/ never imports from backend/ or frontend/.' },
          ],
        },
      ],
    },
  },
);
