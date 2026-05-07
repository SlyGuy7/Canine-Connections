// ESLint configuration — defines code quality rules enforced across all JS/JSX files.
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Skip linting the production build output folder.
  globalIgnores(['dist']),
  {
    // Apply these rules to all JavaScript and JSX source files.
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,               // Standard JS best-practice rules.
      reactHooks.configs.flat.recommended,  // Enforces correct usage of React hooks (e.g. dependency arrays).
      reactRefresh.configs.vite,            // Ensures components are exported correctly for hot-module reload.
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser, // Makes browser globals (window, document, etc.) available without errors.
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true }, // Enables JSX syntax parsing.
        sourceType: 'module',
      },
    },
    rules: {
      // Warn on unused variables but allow UPPER_CASE constants and silently ignore caught errors.
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]', caughtErrors: 'none' }],
      'no-empty': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      // Warn if a file exports something other than a React component (breaks fast refresh).
      'react-refresh/only-export-components': 'warn',
    },
  },
])
