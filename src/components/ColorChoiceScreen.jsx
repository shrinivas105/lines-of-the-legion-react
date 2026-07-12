// components/ColorChoiceScreen.jsx — campaign detail screen shown after
// picking Master or Club. HomeButton + AuthBar already render above this
// screen from App.jsx's sticky app-shell__topbar, so this component only
// owns the content below them: a single bordered panel (title, current
// rank, the Road to Legatus ladder, promotion progress, safety net and
// battle count), the Start Battle button, and a separate rank-info card.
import { Panel } from './Panel';
import { Button } from './Button';
import { LegionPath } from './LegionPath';
import { LichessConnectButton } from './LichessConnectButton';
import { Scoring } from '../logic/scoring';
import { isConnected } from '../services/lichessAuth';
import { LEGION_RANK_PORTRAITS } from './rankColors';
import './ColorChoiceScreen.css';

const RANK_FACTS = {
  Recruit: 'The recruit still learns the discipline of the legion, one opening line at a time.',
  Legionary: 'The legionary keeps the line steady and converts small edges into lasting pressure.',
  Optio: 'The optio organizes the battle, spotting tactical ideas before the enemy can react.',
  Centurion: 'The centurion commands the field with clear plans and ruthless tempo.',
  Tribunus: 'The tribunus reads the fight like a campaign map, predicting the enemy’s next move.',
  Legatus: 'The legatus turns theory into domination, striking with precision and authority.',
};

export function ColorChoiceScreen({ app }) {
  const isMaster = app.aiSource === 'master';
  const merit = isMaster ? (app.legionMerits.master_merit || 0) : (app.legionMerits.lichess_merit || 0);
  const legion = Scoring.getLegionRank(merit);
  const needsLichessAuth = !isConnected();

  const prevThreshold = legion.level > 0 ? legion.thresholds[legion.level] : 0;
  const nextThreshold = legion.nextRank ? legion.thresholds[legion.level + 1] : prevThreshold;
  const span = nextThreshold - prevThreshold;
  const progressPct = legion.nextRank && span > 0
    ? Math.min(100, Math.max(0, ((merit - prevThreshold) / span) * 100))
    : 100;
  const currentRankImage = LEGION_RANK_PORTRAITS[legion.title] || '/ranks/recruit.png';
  const currentRankInfo = {
    label: legion.title,
    text: isMaster
      ? 'A master legionnaire commands the opening lines with ruthless precision and iron discipline.'
      : 'The club legion advances through theory by steady practice, patience, and disciplined calculation.',
  };
  const currentRankFact = RANK_FACTS[legion.title]
    || 'The legion marches onward when discipline and study are kept in balance.';

  return (
    <div className={`color-choice color-choice--${isMaster ? 'master' : 'club'} page-transition`}>
      <div className="color-choice__wrap">
        <Panel className="color-choice__panel">
          <div className={`color-choice__panel-title color-choice__panel-title--${isMaster ? 'master' : 'club'}`}>
            {isMaster ? 'Masters Legion' : 'Club Legion'}
          </div>

          <div className="color-choice__hero">
            <div className="color-choice__hero-top">
              <div className="color-choice__rank-line">
                <span className="color-choice__rank-icon" aria-hidden="true">{legion.icon}</span>
                <span className="color-choice__rank-title">{legion.title}</span>
              </div>
              <div className="color-choice__rank-merit">
                <span className="color-choice__rank-merit-value">{merit}</span>
                <span className="color-choice__rank-merit-label">Merit</span>
              </div>
            </div>
            <div className="color-choice__rank-road">
              {legion.nextRank ? `Road to ${legion.nextRank}` : 'Highest Rank Attained'}
            </div>
          </div>

          <div className="color-choice__road">
            <LegionPath legion={legion} />
          </div>

          <div className="color-choice__progress-section">
            <div className="color-choice__progress-track">
              <div className="color-choice__progress-fill" style={{ width: `${progressPct}%` }}>
                <span className="color-choice__progress-shine" aria-hidden="true" />
              </div>
            </div>
            <div className="color-choice__progress-caption">
              {legion.nextRank
                ? `${merit} / ${nextThreshold} Merit`
                : `${merit} Merit \u2014 Highest Rank Attained`}
            </div>
            {legion.nextRank && (
              <div className="color-choice__progress-subcaption">
                {legion.pointsNeeded} Merit Remaining
              </div>
            )}
          </div>

          <div className="color-choice__panel-actions">
            <div className="color-choice__start">
              <Button variant="danger" size="lg" className="color-choice__start-btn" onClick={() => app.startBattle()}>
                <span className="color-choice__start-icon" aria-hidden="true">⚔️</span>
                <span className="color-choice__start-label">Start Battle</span>
              </Button>
            </div>

            <div className="color-choice__rank-info">
              <div className="color-choice__rank-info-portrait-wrap">
                <img
                  src={currentRankImage}
                  alt={legion.title}
                  className="color-choice__rank-info-portrait"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
              <div className="color-choice__rank-info-body">
                <div className="color-choice__rank-info-title">{legion.icon} {currentRankInfo.label}</div>
                <p className="color-choice__rank-info-text">{currentRankInfo.text}</p>
                <div className="color-choice__rank-divider" role="separator" aria-hidden="true">
                  <span className="color-choice__rank-divider-line" />
                  <span className="color-choice__rank-divider-dot" />
                  <span className="color-choice__rank-divider-line" />
                </div>
                <div className="rank-fact">
                  <div className="rank-fact-title">Did you know?</div>
                  <div className="rank-fact-text">{currentRankFact}</div>
                </div>
              </div>
            </div>
          </div>
        </Panel>

        {needsLichessAuth && (
          <div className="color-choice__notice">
            <p>
              Lines of the Legion reads live game data from Lichess's opening explorer, which now requires a
              connected account for at least some queries. If the battle ends immediately on the first move,
              connect your Lichess account below and try again.
            </p>
            <LichessConnectButton />
          </div>
        )}
      </div>
    </div>
  );
}

export default ColorChoiceScreen;
