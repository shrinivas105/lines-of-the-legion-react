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

// ---------------------------------------------------------------------------
// Extended Roman icon set — replaces the remaining emoji glyphs used for
// rank badges (battle + legion tracks), and assorted UI chrome (home,
// sync, exit, supporters, etc). Same philosophy as above: flat currentColor
// fill, bold simplified shapes, 24x24 grid, legible down to ~18-22px.
// ---------------------------------------------------------------------------

export function IconRomanEagle({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 3.4c.6.9.7 1.9.4 2.9 2.3-1.7 5-2.3 7.6-1.9-1.6 1.2-2.6 2.5-3 4 1.7.2 3 .9 3.9 2-1.9-.3-3.5 0-4.8.9.9.5 1.5 1.2 1.9 2.1-1.3-.6-2.6-.7-3.9-.3-.35 1.4-.15 2.75.6 4.05-1.3-.55-2.2-1.4-2.7-2.55-.5 1.15-1.4 2-2.7 2.55.75-1.3.95-2.65.6-4.05-1.3-.4-2.6-.3-3.9.3.4-.9 1-1.6 1.9-2.1-1.3-.9-2.9-1.2-4.8-.9.9-1.1 2.2-1.8 3.9-2-.4-1.5-1.4-2.8-3-4 2.6-.4 5.3.2 7.6 1.9-.3-1 .2-2 .3-2.9z" />
      <circle cx="12" cy="6.6" r="1.05" />
    </svg>
  );
}

export function IconSPQRBanner({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="11.1" y="1.6" width="1.8" height="20.8" rx="0.6" />
      <path d="M12.9 3.4h6.3c.6 0 .8.6.4 1L17 7l2.6 2.6c.4.4.2 1-.4 1h-6.3z" />
      <text x="12" y="6.55" fontFamily="Georgia, 'Times New Roman', serif" fontSize="3.1" fontWeight="700" fill="var(--umber, #241f19)" textAnchor="middle" letterSpacing="-0.1">SPQR</text>
    </svg>
  );
}

export function IconCrossedGladius({ className }) {
  const sword = (
    <g>
      <path d="M-1 -9 L1 -9 L1 5 L2.6 6.6 L1.6 7.6 L0 6 L-1.6 7.6 L-2.6 6.6 L-1 5 Z" />
      <rect x="-3.2" y="3.6" width="6.4" height="1.5" rx="0.5" />
      <rect x="-0.65" y="4.8" width="1.3" height="4" rx="0.4" />
    </g>
  );
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g transform="translate(12,12) rotate(-40)">{sword}</g>
      <g transform="translate(12,12) rotate(40) scale(-1,1)">{sword}</g>
    </svg>
  );
}

export function IconRomanShield({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 2.2c2.4 1.4 4.7 2 7 1.9.5 3.9.1 7.4-1.2 10.2C16.4 17 14.5 19 12 21c-2.5-2-4.4-4-5.8-6.7C4.9 11.5 4.5 8 5 4.1c2.3.1 4.6-.5 7-1.9z" />
      <rect x="11.1" y="5.4" width="1.8" height="12.4" rx="0.5" fill="var(--umber, #241f19)" />
      <circle cx="12" cy="9.6" r="1.7" fill="var(--umber, #241f19)" />
    </svg>
  );
}

export function IconCenturionHelmet({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M2.6 6.4c1.9-1.3 3.5-1.3 5-.5 1.3-.8 2.8-1.2 4.4-1.2s3.1.4 4.4 1.2c1.5-.8 3.1-.8 5 .5-1 3.4-.4 2.9-1.4 2.5-.5 3.2-2.4 5.6-5.2 6.6l.3 1.6h-6.2l.3-1.6C6.4 14.5 4.5 12.1 4 8.9 3 9.3 3.6 9.8 2.6 6.4z" />
      <path d="M2 8.6c2.4-3.4 6-4.9 10-4.9s7.6 1.5 10 4.9c-1.1-.2-1.9-.4-2.6-.7-1.3-2-4-3.3-7.4-3.3s-6.1 1.3-7.4 3.3c-.7.3-1.5.5-2.6.7z" />
      <rect x="4.3" y="9.3" width="1.6" height="4.6" rx="0.7" />
      <rect x="18.1" y="9.3" width="1.6" height="4.6" rx="0.7" />
    </svg>
  );
}

export function IconLaurelWreath({ className }) {
  const leaf = 'M0 0c1.6.4 2.6 1.4 3 2.8-1.7-.3-2.7-1.2-3-2.8z';
  const branch = (
    <g>
      {[0,1,2,3,4,5].map(i => (
        <path key={i} d={leaf} transform={`translate(${-1.5 + i*0.35}, ${-i*1.55}) rotate(${-15 - i*8}) scale(${0.9 + i*0.05})`} />
      ))}
    </g>
  );
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g transform="translate(6,20)">{branch}</g>
      <g transform="translate(18,20) scale(-1,1)">{branch}</g>
    </svg>
  );
}

export function IconBrokenLaurel({ className }) {
  const leaf = 'M0 0c1.5.4 2.4 1.3 2.8 2.6-1.6-.3-2.5-1.1-2.8-2.6z';
  const branch = (n, drop) => (
    <g>
      {Array.from({ length: n }).map((_, i) => (
        <path key={i} d={leaf} transform={`translate(${-1.4 + i*0.35}, ${-i*1.6 - (drop && i > n-2 ? 1.6 : 0)}) rotate(${-15 - i*8 + (drop && i > n-2 ? 18 : 0)}) scale(0.9)`} opacity={drop && i > n - 2 ? 0.55 : 1} />
      ))}
    </g>
  );
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g transform="translate(6,20)">{branch(6, false)}</g>
      <g transform="translate(18.6,19) scale(-1,1) rotate(6)">{branch(4, true)}</g>
      <circle cx="17.6" cy="9.4" r="0.55" opacity="0.5" />
      <circle cx="19.1" cy="11.6" r="0.4" opacity="0.4" />
    </svg>
  );
}

export const IconRomanScroll = IconScroll;

export function IconStoneTablet({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M5 21V7.4C5 5 6.6 3 9 2.4c1-.25 1.9.6 1.6 1.6-.35 1.15.3 2.3 1.4 2.3h5c1.1 0 2 .9 2 2V21z" />
      <g fill="var(--umber, #241f19)">
        <rect x="7.4" y="10.4" width="9.2" height="1.1" />
        <rect x="7.4" y="13.1" width="9.2" height="1.1" />
        <rect x="7.4" y="15.8" width="6" height="1.1" />
      </g>
    </svg>
  );
}

export function IconOilLamp({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M6.6 4.8c1.9-3 6.9-3 8.8 0 1.7 2.7.8 5.6-1.2 7.2 2.4.2 4.3 1 4.3 2.1 0 1.25-2.6 2.15-6.15 2.35L18 20.8l-1.4.9-4.9-4.15c-3.55-.1-6.3-1-6.3-2.3 0-1.1 1.9-1.9 4.3-2.1-2-1.6-2.9-4.5-1.2-7.2-1.2-.1-2 .1-2.5.9C5.6 5.9 5.6 4.9 6.6 4.8z" />
      <circle cx="11" cy="8.6" r="1.6" fill="var(--umber, #241f19)" />
    </svg>
  );
}

export function IconRomanTemple({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 2.4 21 8.4H3z" />
      <rect x="3" y="9.2" width="18" height="1.3" />
      {[4.3, 7.7, 11.1, 14.5, 17.9].map((x, i) => (
        <rect key={i} x={x} y="11.2" width="1.4" height="7" />
      ))}
      <rect x="2.3" y="18.7" width="19.4" height="1.4" />
      <rect x="1.4" y="20.6" width="21.2" height="1.4" />
    </svg>
  );
}

export function IconVexillum({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="11.1" y="1.6" width="1.8" height="20.8" rx="0.6" />
      <rect x="6.6" y="3.4" width="10.8" height="1.4" rx="0.5" />
      <path d="M7.1 5.2h9.8c.5 3 .3 5.6-.6 8-2.9.8-5.7.8-8.6 0-.9-2.4-1.1-5-.6-8z" />
      <path d="M7.1 5.2 6.3 4h11.4l-.8 1.2z" />
    </svg>
  );
}

export function IconCornu({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4.4 6.2c0-2.2 1.9-4 4.4-4 3.6 0 6.5 3.6 6.5 8s-2.9 8-6.5 8c-2.5 0-4.4-1.8-4.4-4 0-1.8 1.3-3.2 3-3.2s3 1.4 3 3.2" />
      <circle cx="4.5" cy="6.2" r="1.15" fill="currentColor" stroke="none" />
      <path d="M15 6.3c1.7.6 3 1.3 4.6 1.1" strokeWidth="1.6" />
    </svg>
  );
}

export function IconRomanCoin({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="9.6" />
      <circle cx="12" cy="12" r="8" fill="none" stroke="var(--umber, #241f19)" strokeWidth="0.9" />
      <path d="M12 6.6c1.6 1.2 3.2 1.6 4.9 1.3.3 2.6-.1 5-1.2 6.9-1 1.7-2.2 2.9-3.7 3.8-1.5-.9-2.7-2.1-3.7-3.8-1.1-1.9-1.5-4.3-1.2-6.9 1.7.3 3.3-.1 4.9-1.3z" fill="var(--umber, #241f19)" />
    </svg>
  );
}

export function IconRomanMedal({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M7.8 2.2 11.3 9.2 8.9 10.4 5.4 3.4z" />
      <path d="M16.2 2.2 12.7 9.2 15.1 10.4 18.6 3.4z" />
      <circle cx="12" cy="15.4" r="6.4" />
      <circle cx="12" cy="15.4" r="4.5" fill="none" stroke="var(--umber, #241f19)" strokeWidth="0.9" />
      <path d="M12 12.4 13 14.6 15.4 14.9 13.7 16.5 14.1 18.9 12 17.7 9.9 18.9 10.3 16.5 8.6 14.9 11 14.6Z" fill="var(--umber, #241f19)" />
    </svg>
  );
}

export function IconImperialCrown({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4 10.4 2.6 19h18.8l-1.4-8.6-4.3 3.6L12 9l-3.7 5-4.3-3.6z" />
      <rect x="3.4" y="19" width="17.2" height="2" rx="0.5" />
      <circle cx="4" cy="8.6" r="1.35" />
      <circle cx="12" cy="6.6" r="1.6" />
      <circle cx="20" cy="8.6" r="1.35" />
      <circle cx="12" cy="17.2" r="1" fill="var(--umber, #241f19)" />
    </svg>
  );
}

export function IconTrainingCamp({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="11.3" y="2" width="1.4" height="6.4" />
      <path d="M12 2 16.6 5 12 6.2z" />
      <path d="M12 6.4 20 21H4z" />
      <path d="M12 6.4 15 21h-6z" fill="var(--umber, #241f19)" />
      <rect x="3.2" y="20.4" width="17.6" height="1.4" />
    </svg>
  );
}

export function IconFortress({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M2.4 8h3v-2h2v2h1.4V6h2v2H12V6h2v2h1.2V6h2v2h2v-2h2v2h1v13.4H2.4z" />
      <path d="M9.4 21.4v-5.6c0-1.4 1.15-2.4 2.6-2.4s2.6 1 2.6 2.4v5.6z" fill="var(--umber, #241f19)" />
      <rect x="5.4" y="12.4" width="2.6" height="2.6" fill="var(--umber, #241f19)" />
      <rect x="16" y="12.4" width="2.6" height="2.6" fill="var(--umber, #241f19)" />
    </svg>
  );
}

export function IconTrainingSword({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M11 2h2v12.4l3.6 3.6-2 2-2.6-2.6-2.6 2.6-2-2 3.6-3.6z" />
      <rect x="6.6" y="14.6" width="10.8" height="1.7" rx="0.5" />
      <rect x="11.1" y="16.3" width="1.8" height="5.7" rx="0.5" />
    </svg>
  );
}

export function IconVictoryBanner({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="3.4" y="1.6" width="1.8" height="20.8" rx="0.6" />
      <path d="M5.2 3c3-1.3 5.8-1.3 8.6 0 2.5-1.1 4.9-1.2 7.4-.1-.8 1.6-1.1 3-.9 4.6.8 1.5 1 3.1.4 4.8-2.5 1.1-4.9 1-7.4-.1-2.8 1.3-5.6 1.3-8.6 0z" />
    </svg>
  );
}

export function IconBrokenStandard({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="11.2" y="1.8" width="1.6" height="7.4" rx="0.5" />
      <circle cx="12" cy="2.2" r="1.5" />
      <path d="M11.9 9.4 8.6 12.2 12.6 12.6 9.6 15.6 13 15.4z" />
      <rect x="8.6" y="16.4" width="1.6" height="5.8" rx="0.5" transform="rotate(18 9.4 16.4)" />
    </svg>
  );
}

export function IconCircularLaurel({ className }) {
  const leaf = 'M0 0c1.4.35 2.25 1.2 2.55 2.4-1.5-.3-2.3-1.05-2.55-2.4z';
  const ring = (
    <g>
      {Array.from({ length: 7 }).map((_, i) => {
        const a = -100 + i * 15;
        return <path key={i} d={leaf} transform={`rotate(${a}) translate(0,-8.6) scale(0.85)`} />;
      })}
    </g>
  );
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g transform="translate(12,12)">{ring}</g>
      <g transform="translate(12,12) scale(-1,1)">{ring}</g>
      <path d="M8.6 15.6l2.4 2.6 4.2-5.4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconWaxSeal({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 2.4c1 1.1.9 2.2 0 3.2 1.4-.5 2.4-.2 3.1.9-.2-1.5.3-2.4 1.5-2.9-.8 1.2-.7 2.3.4 3.1 1.5-.3 2.4.3 2.7 1.7-1.2-.5-2.2-.1-2.8 1.1.9 1.2.8 2.3-.5 3.1.9 1.1 4.7 4.9-1.6 5.1C13.9 21.4 13 22 12 22s-1.9-.6-2.8-3.3c-6.3-.2-2.5-4-1.6-5.1-1.3-.8-1.4-1.9-.5-3.1-.6-1.2-1.6-1.6-2.8-1.1.3-1.4 1.2-2 2.7-1.7 1.1-.8 1.2-1.9.4-3.1 1.2.5 1.7 1.4 1.5 2.9.7-1.1 1.7-1.4 3.1-.9-.9-1-1-2.1 0-3.2z" />
      <path d="M12 11.4l1 2 2.2.25-1.6 1.55.4 2.2-2-1.05-2 1.05.4-2.2-1.6-1.55 2.2-.25z" fill="var(--umber, #241f19)" />
    </svg>
  );
}

export function IconRomanColumn({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="6.6" y="1.6" width="10.8" height="1.7" rx="0.4" />
      <path d="M7.4 3.8h9.2l.7 2.4H6.7z" />
      {[7.3, 9.15, 11, 12.85, 14.7, 16.55].map((x, i) => (
        <rect key={i} x={x} y="6.5" width="1.05" height="12.6" />
      ))}
      <rect x="6.7" y="19.3" width="10.6" height="1.5" rx="0.3" />
      <rect x="5.8" y="21" width="12.4" height="1.6" rx="0.4" />
    </svg>
  );
}

export function IconChessKnightLaurel({ className }) {
  const leaf = 'M0 0c1.2.3 1.95 1.05 2.2 2.1-1.3-.25-2-.9-2.2-2.1z';
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M8 21v-2.6c0-1 .5-1.6 1.4-2l-.9-1.2c-1.3.2-2.3-.2-2.7-1.3-.35-1 0-1.9 1-2.5-.5-1.1-.3-2.1.7-2.8-.2-1.5.5-2.6 1.9-3.2C10 4.2 11.3 3.6 13 3.6c2.9 0 5.2 1.9 5.6 4.9.3 2.1-.1 3.9-1.2 5.4.9.6 1.5 1.5 1.6 2.6h.6v1.7h-1v2.8h-1.8v-2.8H9.8V21z" />
      <circle cx="14.3" cy="7.6" r="0.75" fill="var(--umber, #241f19)" />
      <g transform="translate(6.6,20.6) rotate(-10)">
        {[0,1,2,3].map(i => (
          <path key={i} d={leaf} transform={`translate(${i*0.55},${-i*1.55}) rotate(${-10 - i*10})`} />
        ))}
      </g>
    </svg>
  );
}
