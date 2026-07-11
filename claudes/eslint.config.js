import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // This app bridges a persistent, intentionally-mutable class instance
    // (ChessTheoryApp — ported verbatim from the legacy vanilla-JS game
    // logic) into React, the same way one would wrap a D3 instance or a
    // game engine. useChessTheoryApp wires app._notify so the class can
    // signal React to re-render; EndGameSummary reads+clears a one-shot
    // message field on that same instance. Both mutations are deliberate,
    // contained, and never participate in memoization, so React Compiler's
    // purity assumptions don't apply here. Scoped override rather than a
    // global one so the rule still applies everywhere else.
    files: [
      'src/hooks/useChessTheoryApp.js',
      'src/components/EndGameSummary.jsx',
    ],
    rules: {
      'react-hooks/immutability': 'off',
    },
  },
])
