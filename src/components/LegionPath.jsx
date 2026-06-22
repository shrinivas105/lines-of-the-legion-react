// components/LegionPath.jsx — replaces the flat row-of-pills rank ladder
// with an ascending staircase: each rank sits higher than the last, a single
// continuous road threads through all six, conquered ground is lit in
// bronze, the road ahead fades into shadow, and a standard-bearer marker
// sits at the player's exact position (including progress toward the next
// step, not just "which box"). Reads as one climb toward Legatus rather
// than six equal, disconnected boxes.
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

  // Step i sits at x = i/(n-1) along the road, y rises (lower = higher rank).
  const stepX = (i) => (i / (n - 1)) * 100;
  const stepY = (i) => 100 - (i / (n - 1)) * 78; // 78% total rise, leaves headroom

  // Marker position: interpolate between current step and next step based
  // on progress toward the next threshold, so the eagle visibly creeps
  // forward as merit accrues, not just jumps between fixed dots.
  const isMax = level >= n - 1;
  const span = isMax ? 1 : (thresholds[level + 1] - thresholds[level]) || 1;
  const into = isMax ? 1 : Math.min(1, Math.max(0, (merit - thresholds[level]) / span));
  const markerX = isMax ? stepX(n - 1) : stepX(level) + (stepX(level + 1) - stepX(level)) * into;
  const markerY = isMax ? stepY(n - 1) : stepY(level) + (stepY(level + 1) - stepY(level)) * into;

  const pathPoints = rankOrder.map((_, i) => `${stepX(i)},${stepY(i)}`).join(' ');

  // Safety-net ticks: one per rank that has a safety net (Legionary through
  // Tribunus — Recruit has nothing to fall from, Legatus has no rank above
  // it to fall to), positioned at the midpoint of that rank's outgoing
  // segment, exactly where Scoring.getSafetyNetThreshold places it.
  const safetyTicks = rankOrder
    .map((title, i) => {
      if (i >= n - 1) return null; // no outgoing segment from the last rank
      const safetyMerit = Scoring.getSafetyNetThreshold(title);
      if (safetyMerit == null) return null;
      const segSpan = thresholds[i + 1] - thresholds[i];
      const pct = segSpan > 0 ? (safetyMerit - thresholds[i]) / segSpan : 0.5;
      return {
        title,
        merit: safetyMerit,
        x: stepX(i) + (stepX(i + 1) - stepX(i)) * pct,
        y: stepY(i) + (stepY(i + 1) - stepY(i)) * pct,
        passed: merit >= safetyMerit || level > i,
      };
    })
    .filter(Boolean);

  return (
    <div className="legion-path">
      <svg
        className="legion-path__svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Rank path from Recruit to Legatus. Currently ${legion.title}.`}
      >
        {/* full road, dim — the whole journey, including ground not yet won */}
        <polyline points={pathPoints} className="legion-path__road" vectorEffect="non-scaling-stroke" />
        {/* conquered road, lit — from start up to the marker's current position */}
        <polyline
          points={`${pathPoints.split(' ').slice(0, level + 1).join(' ')}${level < n - 1 ? ` ${markerX},${markerY}` : ''}`}
          className="legion-path__road-won"
          vectorEffect="non-scaling-stroke"
        />
        {/* safety-net ticks — small diamonds straddling the road at each
            rank's 50%-to-next-promotion point */}
        {safetyTicks.map(tick => (
          <rect
            key={tick.title}
            x={tick.x - 1.6}
            y={tick.y - 1.6}
            width="3.2"
            height="3.2"
            transform={`rotate(45 ${tick.x} ${tick.y})`}
            className={`legion-path__safety-tick ${tick.passed ? 'legion-path__safety-tick--passed' : ''}`}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

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
                conquered ? 'legion-path__step--won' : '',
                isCurrent ? 'legion-path__step--current' : '',
              ].filter(Boolean).join(' ')}
              style={{ left: `${stepX(i)}%`, top: `${stepY(i)}%` }}
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

        {/* the marker — standard-bearer at the player's exact progress point */}
        <div
          className="legion-path__marker"
          style={{ left: `${markerX}%`, top: `${markerY}%` }}
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
