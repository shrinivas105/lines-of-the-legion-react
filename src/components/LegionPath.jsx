// components/LegionPath.jsx — the Road to Legatus rank ladder: all six
// ranks sit in a single flat row, a continuous horizontal line threads
// through all of them, and the current rank's node gets a glow ring via
// RankBadge's `active` prop. Each node carries a small rank-name label
// underneath so the ladder is legible without hovering, alongside the
// badges and connecting line.
//
// Pure presentation — consumes the same Scoring.getLegionRank() shape
// (title, level, rankOrder) already used by LegionCard/ColorChoiceScreen.
//
// Nodes render via the shared RankBadge component (same one used on the
// Legion cards) so any rank with AI-generated portrait artwork shows it
// here too, automatically.
import { Fragment } from 'react';
import { RankBadge } from './RankBadge';
import './LegionPath.css';

export function LegionPath({ legion }) {
  const { rankOrder, level } = legion;

  return (
    <div className="legion-path">
      <div className="legion-path__steps">
        {rankOrder.map((title, i) => {
          const conquered = i <= level;
          const isCurrent = i === level;
          const isLast = i === rankOrder.length - 1;
          const connectorActive = i < level;

          return (
            <Fragment key={title}>
              <div
                className={[
                  'legion-path__step',
                  conquered ? 'legion-path__step--reached' : '',
                  isCurrent ? 'legion-path__step--current' : '',
                ].filter(Boolean).join(' ')}
              >
                <div className="legion-path__node">
                  <RankBadge title={title} size="md" active={isCurrent} />
                </div>
                <div className="legion-path__label">{title}</div>
              </div>
              {!isLast && (
                <div
                  className={[
                    'legion-path__connector',
                    connectorActive ? 'legion-path__connector--active' : '',
                  ].filter(Boolean).join(' ')}
                  aria-hidden="true"
                >
                  →
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default LegionPath;
