# Lines of the Legion — Chess Theory Trainer

A Roman-military-themed chess opening trainer, ported from a legacy vanilla-JS
app to **Vite + React**, with a fully redesigned "carved-stone / bronze
inscription" visual identity. All game logic, scoring formulas, rank
progression, demotion rules, and API behavior are preserved from the
original — only the rendering layer and visual design changed.

## Getting started

```bash
npm install
npm run dev       # starts dev server on http://localhost:5173
npm run build     # production build to dist/
npm run preview   # preview the production build
npm run lint       # eslint
```

## Project structure

```
src/
  logic/           Core game logic — ported ~verbatim from the legacy app
    chessTheoryApp.js    The main game state machine (was game-logic.js)
    scoring.js            Rank/score formulas (was scoring.js)
    pgnExporter.js         PGN generation (was pgn-exporter.js)
    romanBattleEffects.js  Sound effects (was roman-battle-effects.js)
    analysisBoard.js        Post-game analysis data/logic (was analysis-board.js)
    authModule.js            Auth + cloud-sync orchestration (was auth.js)
  services/        External integrations
    chessApi.js            Lichess Explorer + eval API (was chess-api.js)
    lichessAuth.js          Lichess OAuth PKCE flow (was lichess-auth.js)
    supabaseClient.js       Supabase client + progress sync (was supabase-client.js)
  config/          Tunable constants (was config.js / practice-openings.js)
  hooks/
    useChessTheoryApp.js  Bridges the ChessTheoryApp class instance into React
  components/      All UI — fully redesigned, new visual system
  styles/
    tokens.css      Design tokens (colors, type, spacing) for the whole app
```

## Architecture note: the class-instance bridge

The legacy app was a single, long-lived `ChessTheoryApp` class instance that
painted the DOM directly inside its own `render()` method. Rather than
rewrite this into idiomatic `useState`/`useReducer` (which risks subtly
changing behavior across ~900 lines of interdependent game logic), this port
keeps `ChessTheoryApp` as a persistent class instance (held via
`useChessTheoryApp`) and has React components read its fields directly.
When the class calls `this.render()`, it now just signals React to
re-render via a `_notify()` callback — the exact same call sites, exact same
order of operations, as the original.

This means: **every scoring formula, every conditional branch, every state
transition is the same code, just no longer manually manipulating
`innerHTML`.**

## What changed vs. the legacy app

- **Visual design**: complete redesign — new color system, typography
  (Cinzel/Spectral/JetBrains Mono), "inscription tablet" panel motif,
  wax-seal rank medallions, redesigned analysis board — replacing the
  original CSS entirely.
- **chess.js version**: the legacy app used chess.js 0.10.3 via CDN, which
  returns `null` for illegal moves. The npm chess.js (1.x) used here
  **throws** on illegal moves instead. All `.move()` call sites are
  wrapped in `try/catch` to preserve the original's "silently ignore
  illegal move attempts" behavior.
- **Reset Progress button**: in the legacy snapshot, this button's
  `onclick` handler was never wired up (a dead button — verified by
  checking which renderer file `index.html` actually loaded). It's now
  wired to the pre-existing `resetStats()` method behind a confirmation
  dialog, since that's the button's own stated purpose and the method
  already existed and worked correctly.
- **Everything else** (scoring math, rank thresholds, demotion/promotion
  rules, move-quality detection, hint/"Consult Commander" logic, PGN
  export, OAuth flows, cloud sync): unchanged.

## Known pre-existing quirks (preserved, not "fixed")

These exist in the original app too and were intentionally left as-is:

- `RomanBattleEffects.playAmbientLoop()` references `roman-ambient.mp3`,
  which was never included in the original asset set — calling it will
  fail silently (caught) just like in the original.
- A few unused variables/imports in the scoring and PGN logic (e.g.
  `finalScore` reassigned but only the second value used) are preserved
  verbatim from the source rather than cleaned up, to avoid any risk of
  altering behavior.
