// components/LegionPath.jsx — the "Road to Legatus" rank ladder: all six
// ranks sit in a single flat row (matching the legacy layout exactly), a
// continuous horizontal line threads through all of them, conquered ground
// is lit in bronze, the road ahead fades into shadow, and a standard-bearer
// marker sits at the player's exact position (including progress toward
// the next step, not just "which box").
//
// Pure presentation — consumes the same Scoring.getLegionRank() shape
// (title, icon, merit, thresholds, level, rankOrder) already used by
// LegionCard/ColorChoiceScreen, plus Scoring.getSafetyNetThreshold() for
// the safety-net ticks. No scoring logic here — both are read-only lookups
// against numbers Scoring already owns.
//
// Nodes render via the shared RankBadge component (same one used on the
// Legion cards) so any rank with AI-generated portrait artwork shows it
// here too, automatically — this file no longer keeps its own separate
// emoji-only icon list.
//
// Every step shows its goal merit threshold under the name (not just the
// very next rank), and each rank's safety-net point — the merit at which a
// bad streak resets you to the start of your CURRENT rank instead of
// demoting you to the PREVIOUS one — is marked as a small tick on the road.
// Per Scoring.getSafetyNetThreshold's own math, that point always sits at
// exactly the 50% mark of the segment leading OUT of that rank (toward the
// next one), not the segment leading into it.
import { Scoring } from '../logic/scoring';
import { RankBadge } from './RankBadge';
import './LegionPath.css';

export function LegionPath({ legion }) {
  const { rankOrder, thresholds, level, merit } = legion;
  const n = rankOrder.length;

  // Use a horizontal, flex-based layout to match the legacy UI:
  // steps are spaced evenly, the connecting line is drawn via CSS ::before,
  // and the marker is positioned by interpolating left% between steps.
  const stepX = (i) => (i / (n - 1)) * 100;
  const isMax = level >= n - 1;
  const span = isMax ? 1 : (thresholds[level + 1] - thresholds[level]) || 1;
  const into = isMax ? 1 : Math.min(1, Math.max(0, (merit - thresholds[level]) / span));
  const markerX = isMax ? stepX(n - 1) : stepX(level) + (stepX(level + 1) - stepX(level)) * into;

  const safetyTicks = rankOrder
    .map((title, i) => {
      if (i >= n - 1) return null;
      const safetyMerit = Scoring.getSafetyNetThreshold(title);
      if (safetyMerit == null) return null;
      const segSpan = thresholds[i + 1] - thresholds[i];
      const pct = segSpan > 0 ? (safetyMerit - thresholds[i]) / segSpan : 0.5;
      return {
        title,
        x: stepX(i) + (stepX(i + 1) - stepX(i)) * pct,
        passed: merit >= safetyMerit || level > i,
      };
    })
    .filter(Boolean);

  return (
    <div className="legion-path">
      <div className="legion-path__steps">
        {rankOrder.map((title, i) => {
          const conquered = i <= level;
          const isCurrent = i === level;
          const isNext = i === level + 1 && !isMax;
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
                <RankBadge title={title} size="md" />
              </div>
              <div className="legion-path__label">
                {title}
                {isCurrent && <span className="legion-path__label-tag">You</span>}
                <span className="legion-path__label-goal">{thresholds[i]} merit</span>
                {isNext && <span className="legion-path__label-need">{thresholds[i] - merit} to go</span>}
              </div>
            </div>
          );
        })}

        <div
          className="legion-path__marker"
          style={{ left: `${markerX}%` }}
          title={`${merit} merit`}
        >
          <div className="legion-path__marker-pulse" />
          <div className="legion-path__marker-flag">🚩</div>
        </div>
      </div>

      <div className="legion-path__legend">
        <span className="legion-path__legend-tick" aria-hidden="true" />
        <span>Safety net — a bad streak past this point resets you to the start of that rank, not the one before it</span>
      </div>
    </div>
  );
}

export default LegionPath;
