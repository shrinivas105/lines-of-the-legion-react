// components/BattleHistory.jsx — recent battle-rank badges + demotion tooltip.
// Mirrors renderBattleHistory() in ui-renderer.js exactly: same data source
// (app.getRecentBattleRanks, Scoring.getDemotionWarning), same conditions for
// showing/hiding. Visual presentation redesigned (badges instead of plain
// letter blocks; tooltip uses a popover pattern instead of CSS-only hover).
//
// A first-time player has no way to know what Levy/Hastatus/Principes/
// Triarius/Imperator mean from color alone — badges now show a label
// underneath, and the "?" popover leads with a plain rank legend before
// the demotion-math table, so the colors are explained, not just decoded
// via hover tooltip (which doesn't work on touch anyway).
import { useState } from 'react';
import { Scoring } from '../logic/scoring';
import { RankBadge } from './RankBadge';
import { BATTLE_RANK_COLORS } from './rankColors';
import './BattleHistory.css';

const BATTLE_RANK_ORDER = ['Levy', 'Hastatus', 'Principes', 'Triarius', 'Imperator'];

export function BattleHistory({ app, source }) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const meritKey = `${source}_merit`;
  const currentMerit = app.legionMerits[meritKey] || 0;
  const legionInfo = Scoring.getLegionRank(currentMerit);
  const recentRanks = app.getRecentBattleRanks(source);
  const warning = Scoring.getDemotionWarning(legionInfo.title, recentRanks, currentMerit);

  if (recentRanks.length === 0) return null;

  return (
    <div className="battle-history">
      <div className="battle-history__row">
        <div className="battle-history__title">
          Last {recentRanks.length} Battle{recentRanks.length > 1 ? 's' : ''}
        </div>
        <div className="battle-history__right">
          <div className="battle-history__badges">
            {recentRanks.map((rank, idx) => (
              <div className="battle-history__badge-item" key={idx}>
                <RankBadge title={rank} size="sm" />
                <span className="battle-history__badge-label" style={{ color: BATTLE_RANK_COLORS[rank] }}>
                  {rank}
                </span>
              </div>
            ))}
          </div>
          <div className="battle-history__tooltip-wrap">
            <button
              className="battle-history__tooltip-icon"
              onClick={() => setTooltipOpen(v => !v)}
              onBlur={() => setTimeout(() => setTooltipOpen(false), 150)}
              aria-label="What do these ranks mean?"
            >
              ?
            </button>
            {tooltipOpen && (
              <div className="battle-history__tooltip-content">
                <div className="battle-history__tooltip-title">Battle Ranks, Worst to Best</div>
                <div className="battle-history__legend">
                  {BATTLE_RANK_ORDER.map(rank => (
                    <div className="battle-history__legend-row" key={rank}>
                      <RankBadge title={rank} size="sm" />
                      <span style={{ color: BATTLE_RANK_COLORS[rank] }}>{rank}</span>
                    </div>
                  ))}
                </div>
                <div className="battle-history__tooltip-title battle-history__tooltip-title--second">Demotion Rules</div>
                <table className="demotion-table">
                  <thead>
                    <tr>
                      <th>Current Rank</th>
                      <th>Poor Performance (last 5 battles)</th>
                      <th>Demote To</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>Recruit</td><td>N/A</td><td>N/A</td></tr>
                    <tr><td>Legionary</td><td>2 Levy battles</td><td>Recruit (or reset to 200)</td></tr>
                    <tr><td>Optio</td><td>2 Levy or 2 Hastatus or (1 Levy + 1 Hastatus)</td><td>Legionary (or reset to 500)</td></tr>
                    <tr><td>Centurion</td><td>ANY Levy or Hastatus OR no Triarius/Imperator in 5 battles</td><td>Optio (or reset to 900)</td></tr>
                    <tr><td>Tribunus</td><td>ANY Levy or Hastatus OR less than 3 Triarius/Imperator</td><td>Centurion (or reset to 1300)</td></tr>
                    <tr><td>Legatus</td><td>N/A</td><td>N/A</td></tr>
                  </tbody>
                </table>
                <div className="battle-history__safety-note">
                  <strong>Safety Net:</strong> If you reach 50% progress in your rank, demotion resets you to the start of your current rank instead of dropping you to the previous rank.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {warning && (
        <div
          className="battle-history__warning"
          dangerouslySetInnerHTML={{ __html: warning }}
        />
      )}
    </div>
  );
}

export default BattleHistory;
