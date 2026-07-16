// components/RankBadge.jsx — Roman military medal for a rank (Legion or Battle).
// A circular medallion with a metallic gradient face, engraved-ring relief,
// and a wax-seal-style outer rim. Supports an opt-in `promoted` flag that
// plays a single ~1s gold pulse — used at the moment a promotion is shown
// (see EndGameSummary), never a looping/ambient effect.
//
// Legion ranks (Recruit -> Legatus) render an AI-generated engraved-coin
// portrait when one exists for that rank (see LEGION_RANK_PORTRAITS in
// rankColors.js), replacing the plain emoji glyph. Battle ranks (Levy
// through Imperator) and any Legion rank without artwork yet keep the
// emoji — this is a graceful partial rollout, not an all-or-nothing swap.
// If a portrait file ever fails to load, onError falls back to the emoji
// at runtime rather than showing a broken-image icon.
import { useState } from 'react';
import './RankBadge.css';
import { BATTLE_RANK_COLORS, LEGION_RANK_COLORS, BATTLE_RANK_ICONS, LEGION_RANK_PORTRAITS } from './rankColors';

export function RankBadge({ title, icon, active = false, size = 'md', tone, promoted = false, className = '' }) {
  const [imgFailed, setImgFailed] = useState(false);

  const color = tone || BATTLE_RANK_COLORS[title] || LEGION_RANK_COLORS[title] || 'var(--bronze)';
  const glyph = icon || BATTLE_RANK_ICONS[title] || title?.[0];
  const GlyphIcon = typeof glyph === 'function' ? glyph : null;
  const portraitSrc = !imgFailed ? LEGION_RANK_PORTRAITS[title] : null;

  return (
    <div
      className={[
        'rank-badge',
        `rank-badge--${size}`,
        portraitSrc ? 'rank-badge--portrait' : '',
        active ? 'rank-badge--active' : '',
        promoted ? 'rank-badge--promoted' : '',
        className,
      ].filter(Boolean).join(' ')}
      style={{ '--badge-color': color }}
      title={title}
    >
      <span className="rank-badge__ring" aria-hidden="true" />
      {portraitSrc ? (
        <img
          className="rank-badge__portrait"
          src={portraitSrc}
          alt={title}
          onError={() => setImgFailed(true)}
        />
      ) : GlyphIcon ? (
        <GlyphIcon className="rank-badge__icon-svg" />
      ) : (
        <span className="rank-badge__icon">{glyph}</span>
      )}
    </div>
  );
}

export default RankBadge;
