// components/rankColors.js — shared rank identity colors/icons.
// Split out from RankBadge.jsx so that file can export only the component
// (required for Vite Fast Refresh — a file mixing component + constant
// exports breaks its HMR boundary detection). Both RankBadge and
// EndGameSummary import from here, so battle-rank colors stay in sync
// everywhere they're shown (small "Last N Battles" badges, the big
// end-of-game rank ladder, etc).

// Battle-rank identity colors (Levy through Imperator) — punchy and
// verified at 4.5:1+ contrast against --ink. Previously RankBadge had a
// separate, much paler fallback map (Levy -> marble-dim) that read as
// washed-out/flat at small badge sizes; this replaced it everywhere.
export const BATTLE_RANK_COLORS = {
  Levy:       '#2ecc71',
  Hastatus:   '#ecf0f1',
  Principes:  '#e74c3c',
  Triarius:   '#3498db',
  Imperator:  '#9b59b6',
};

// Escalating Legion-rank ramp (Recruit -> Legatus): starts dull (you
// haven't earned color yet) and warms into bright gold at the top, so the
// medal itself reads as progress, not just a flat bronze circle six times
// in a row with only the icon/label differing. All stops pass 4.5:1+ on
// --ink.
export const LEGION_RANK_COLORS = {
  Recruit:   '#7c8085',
  Legionary: '#9c7a4a',
  Optio:     '#b8935a',
  Centurion: '#c9a16b',
  Tribunus:  '#d8b66b',
  Legatus:   '#f0d896',
};

// Default icon glyphs for battle ranks, used when no explicit icon is
// passed — gives small badges (e.g. battle history) a real symbol instead
// of a bare initial letter.
export const BATTLE_RANK_ICONS = {
  Levy:       '🪖',
  Hastatus:   '🛡️',
  Principes:  '⚔️',
  Triarius:   '🦅',
  Imperator:  '👑',
};

// AI-generated engraved-medallion portraits for all six Legion ranks
// (Recruit -> Legatus), replacing the plain emoji glyphs. The fallback
// chain in RankBadge still applies if a file is ever missing or fails to
// load — this list doesn't need to stay exhaustive to keep working.
// Images live in /public/ranks/ so they're served as static assets (not
// bundled/inlined).
export const LEGION_RANK_PORTRAITS = {
  Recruit: '/ranks/Recruit_new.png',
  Legionary: '/ranks/Legionary_new.png',
  Optio: '/ranks/Optio_new.png',
  Centurion: '/ranks/Centurion_new.png',
  Tribunus: '/ranks/Tribunus_new.png',
  Legatus: '/ranks/Legatus_new.png',
};
