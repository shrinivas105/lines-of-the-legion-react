// components/LegionCard.jsx — shows Legion rank, merit progress bar, and
// games played for a given source ('master' | 'lichess'). Reads exactly the
// same fields as renderLegionStatus() in ui-renderer.js did.
//
// Master and Club legions get a distinct metal identity (gold vs silver) —
// a colored card border/glow plus a metal-tag label — so the two cards are
// unmistakable at a glance instead of relying on small text alone.
import { Scoring } from '../logic/scoring';
import { RankBadge } from './RankBadge';
import { BattleHistory } from './BattleHistory';
import './LegionCard.css';

export function LegionCard({ app, source, label, metal }) {
  const resolvedMetal = metal || (source === 'master' ? 'gold' : 'silver');
  const meritKey = `${source}_merit`;
  const merit = app.legionMerits[meritKey] || 0;
  const legion = Scoring.getLegionRank(merit);
  const gamesPlayed = source === 'master' ? app.gamesPlayedMaster : app.gamesPlayedLichess;

  const prevThreshold = legion.level > 0 ? legion.thresholds[legion.level] : 0;
  const nextThreshold = legion.nextRank ? legion.thresholds[legion.level + 1] : prevThreshold;
  const span = nextThreshold - prevThreshold;
  const progressPct = legion.nextRank && span > 0
    ? Math.min(100, Math.max(0, ((merit - prevThreshold) / span) * 100))
    : 100;

  return (
    <div className={`legion-card legion-card--${resolvedMetal}`}>
      <div className={`legion-card__metal-tag legion-card__metal-tag--${resolvedMetal}`}>
        {resolvedMetal === 'gold' ? '★ Master Legion' : '◆ Club Legion'}
      </div>

      <div className="legion-card__head">
        <RankBadge
          title={legion.title}
          icon={legion.icon}
          size="lg"
          active
          tone={resolvedMetal === 'gold' ? 'var(--gold)' : 'var(--silver)'}
        />
        <div className="legion-card__titles">
          <div className="legion-card__source">{label}</div>
          <div className="legion-card__rank">{legion.title}</div>
        </div>
      </div>

      <div className="legion-card__progress-track">
        <div className="legion-card__progress-fill" style={{ width: `${progressPct}%` }} />
      </div>
      <div className="legion-card__progress-label">
        {legion.nextRank
          ? `${merit} merit · ${legion.pointsNeeded} to ${legion.nextRank}`
          : `${merit} merit · Highest Rank Attained`}
      </div>

      <div className="legion-card__games">{gamesPlayed} battles fought</div>

      <BattleHistory app={app} source={source} />
    </div>
  );
}

export default LegionCard;
