// components/RomanIcons.jsx — small hand-drawn Roman-motif icon set used in
// place of emoji glyphs in UI chrome (quick actions, etc). Each icon is a
// single-color silhouette on a 24x24 grid, filled with `currentColor` so it
// inherits text color/opacity from its wrapping element exactly like a text
// glyph would — no baked-in colors to keep in sync with the theme.
//
// Kept deliberately simple/bold rather than photorealistic: these render as
// small as ~22px in the quick-action bar, and fine detail disappears at that
// size. Match this style (flat fill, thick shapes, no gradients) if adding
// more icons here rather than reaching for a generic icon library — the
// point is a consistent, slightly rough-cut "struck in bronze" feel that
// matches the rest of the Roman chrome (see the eagle divider glyph in
// MenuScreen.jsx for the same philosophy).

export function IconReset({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M18.2 6.1A8 8 0 1 1 12 4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M18.9 2.3 L19.6 6.9 L15.3 5.8 Z" />
      <g transform="translate(12,19.3)">
        <path d="M0 2.6c-2.6-.2-4.4-1.6-5.1-3.4 1.4 1.1 3.1 1.5 5.1 1.1 2 .4 3.7 0 5.1-1.1-.7 1.8-2.5 3.2-5.1 3.4z" />
        <path d="M-3.6-.9c-.9-.9-1.3-2-1.2-3.1.6.9 1.5 1.5 2.6 1.7-.2.6-.7 1.1-1.4 1.4z" />
        <path d="M3.6-.9c.9-.9 1.3-2 1.2-3.1-.6.9-1.5 1.5-2.6 1.7.2.6.7 1.1 1.4 1.4z" />
      </g>
    </svg>
  );
}

export function IconScroll({ className }) {
  const body = (
    <>
      <rect x="5.5" y="6" width="13" height="12" rx="0.4" />
      <path d="M5.5 6c0-1.5 1.4-2.6 3.1-2.6h6.8c1.7 0 3.1 1.1 3.1 2.6-.7-.9-1.9-1.4-3.1-1.4H8.6c-1.2 0-2.4.5-3.1 1.4z" />
      <ellipse cx="5.5" cy="6" rx="1.5" ry="1.9" />
      <ellipse cx="18.5" cy="6" rx="1.5" ry="1.9" />
      <path d="M5.5 18c0 1.5 1.4 2.6 3.1 2.6h6.8c1.7 0 3.1-1.1 3.1-2.6-.7.9-1.9 1.4-3.1 1.4H8.6c-1.2 0-2.4-.5-3.1-1.4z" />
      <ellipse cx="5.5" cy="18" rx="1.5" ry="1.9" />
      <ellipse cx="18.5" cy="18" rx="1.5" ry="1.9" />
    </>
  );
  const lines = (
    <>
      <rect x="8" y="9.3" width="8" height="0.9" />
      <rect x="8" y="11.6" width="8" height="0.9" />
      <rect x="8" y="13.9" width="5.3" height="0.9" />
    </>
  );
  // Text lines are cut out via mask (true transparency) rather than an
  // explicit dark fill, so the icon still works correctly over any
  // background — including the gold hover/active glow behind it.
  const maskId = 'roman-scroll-mask';
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse">
          <g fill="white">{body}</g>
          <g fill="black">{lines}</g>
        </mask>
      </defs>
      <rect x="0" y="0" width="24" height="24" fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  );
}

export function IconAmphora({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M10.3 2.6 h3.4 v1.9 h-3.4 z" />
      <path d="M9.7 4.3 h4.6 v0.9 h-4.6 z" />
      <path d="M10.1 5.2 c-.15 1.6-.55 2.55-1.1 3.35 3.4.85 4.6.85 8 0-.55-.8-.95-1.75-1.1-3.35z" />
      <path d="M6.2 9.6c1-.75 1.85-1.05 2.8-1.15 1.55 1 4.45 1 6 0 .95.1 1.8.4 2.8 1.15 1.9 3.3 1.7 7.9-1.1 10.55-1.15 1.1-2.55 1.65-4.2 1.65s-3.05-.55-4.2-1.65c-2.8-2.65-3-7.25-1.1-10.55z" />
      <path d="M8.3 6.9 C6.5 7.2 5.15 8.35 4.75 10.1 C4.45 11.4 4.8 12.35 5.5 12.55 C5.3 11.05 5.65 9.65 6.4 8.5 C6.85 7.8 7.5 7.25 8.3 6.9 Z M7.35 8.35 C6.8 8.8 6.35 9.4 6.05 10.1 C5.85 10.6 5.75 11.05 5.78 11.45 C5.55 11.15 5.5 10.65 5.68 10 C5.98 8.9 6.75 8.35 7.35 8.35 Z" />
      <path d="M15.7 6.9 C17.5 7.2 18.85 8.35 19.25 10.1 C19.55 11.4 19.2 12.35 18.5 12.55 C18.7 11.05 18.35 9.65 17.6 8.5 C17.15 7.8 16.5 7.25 15.7 6.9 Z M16.65 8.35 C17.2 8.8 17.65 9.4 17.95 10.1 C18.15 10.6 18.25 11.05 18.22 11.45 C18.45 11.15 18.5 10.65 18.32 10 C18.02 8.9 17.25 8.35 16.65 8.35 Z" />
    </svg>
  );
}
