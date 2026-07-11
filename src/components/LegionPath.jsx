// components/LegionPath.jsx — the Road to Legatus rank ladder: all six
// ranks sit in a single flat row, a continuous horizontal line threads
// through all of them, and the current rank's node gets a glow ring via
// RankBadge's `active` prop. Deliberately minimal — just the badges and
// the line, no per-node labels/flag/legend — so it reads at a glance.
//
// Pure presentation — consumes the same Scoring.getLegionRank() shape
// (title, level, rankOrder) already used by LegionCard/ColorChoiceScreen.
//
// Nodes render via the shared RankBadge component (same one used on the
// Legion cards) so any rank with AI-generated portrait artwork shows it
// here too, automatically.
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
          return (
            <div
              key={title}
              className={[
                'legion-path__step',
                conquered ? 'legion-path__step--reached' : '',
                isCurrent ? 'legion-path__step--current' : '',
              ].filter(Boolean).join(' ')}
            >
              <div className="legion-path__node">
                <RankBadge title={title} size="md" active={isCurrent} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LegionPath;
