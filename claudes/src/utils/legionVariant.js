// utils/legionVariant.js — single source of truth for the campaign accent
// color used across the whole battle flow (game screen, end-of-battle
// summary, promotion ceremony, post-battle analysis): gold for Master,
// silver for Club, bronze for Practice. Mirrors the same convention already
// established by the Master/Club/Practice cards on the menu and by
// ColorChoiceScreen's Start Battle button (--legion-accent), just expressed
// as a Button `variant` instead of a CSS custom property.
export function legionVariant(app) {
  if (app.mode === 'practice') return 'bronze';
  return app.aiSource === 'master' ? 'gold' : 'silver';
}
