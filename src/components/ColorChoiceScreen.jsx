// components/ColorChoiceScreen.jsx — campaign detail screen shown after
// picking Master or Club. HomeButton + AuthBar already render above this
// screen from App.jsx's sticky app-shell__topbar, so this component only
// owns the content below them: a single bordered panel (title, current
// rank, the Road to Legatus ladder, promotion progress, safety net and
// battle count), the Start Battle button, and a separate rank-info card.
import { Panel } from './Panel';
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
  const battlesFought = isMaster ? (app.gamesPlayedMaster || 0) : (app.gamesPlayedLichess || 0);
  const legion = Scoring.getLegionRank(merit);
  const needsLichessAuth = !isConnected();

  const prevThreshold = legion.level > 0 ? legion.thresholds[legion.level] : 0;
  const nextThreshold = legion.nextRank ? legion.thresholds[legion.level + 1] : prevThreshold;
  const span = nextThreshold - prevThreshold;
  const progressPct = legion.nextRank && span > 0
    ? Math.min(100, Math.max(0, ((merit - prevThreshold) / span) * 100))
    : 100;
  const progressPctRounded = Math.round(progressPct);

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
    <div className="color-choice page-transition">
      <div className="color-choice__wrap">
        <Panel className="color-choice__panel">
          <div className={`color-choice__panel-title color-choice__panel-title--${isMaster ? 'master' : 'club'}`}>
            {isMaster ? 'Masters Legion' : 'Club Legion'}
          </div>

          <div className="color-choice__rank-line">
            {legion.icon} {legion.title} <span className="color-choice__rank-line-merit">({merit} merit)</span>
          </div>

          <div className="color-choice__road">
            <LegionPath legion={legion} />
          </div>

          <div className="color-choice__progress-section">
            <div className="color-choice__progress-heading">
              {legion.nextRank ? `${legion.title} \u2192 ${legion.nextRank}` : `${legion.title} \u2014 Highest Rank Attained`}
            </div>
            <div className="color-choice__progress-track">
              <div className="color-choice__progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="color-choice__progress-caption">
              {legion.nextRank
                ? `${merit} / ${nextThreshold} merit (${progressPctRounded}%)`
                : `${merit} merit (100%)`}
            </div>
          </div>

          <div className="color-choice__meta-row">
            <span className="color-choice__battles">Battles Fought: {battlesFought}</span>
          </div>

          <div className="color-choice__panel-actions">
            <div className="color-choice__start">
              <button className="menu-btn gold-btn color-choice__start-btn" type="button" onClick={() => app.startBattle()}>
                ⚔️ Start Battle
              </button>
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
