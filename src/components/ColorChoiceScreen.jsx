import { LegionPath } from './LegionPath';
import { LichessConnectButton } from './LichessConnectButton';
import { RankBadge } from './RankBadge';
import { Scoring } from '../logic/scoring';
import { isConnected } from '../services/lichessAuth';
import { LEGION_RANK_PORTRAITS } from './rankColors';
import './ColorChoiceScreen.css';

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
  const rankFacts = {
    Recruit: 'The recruit still learns the discipline of the legion, one opening line at a time.',
    Legionary: 'The legionary keeps the line steady and converts small edges into lasting pressure.',
    Optio: 'The optio organizes the battle, spotting tactical ideas before the enemy can react.',
    Centurion: 'The centurion commands the field with clear plans and ruthless tempo.',
    Tribunus: 'The tribunus reads the fight like a campaign map, predicting the enemy’s next move.',
    Legatus: 'The legatus turns theory into domination, striking with precision and authority.',
  };
  const currentRankInfo = {
    label: legion.title,
    text: isMaster
      ? 'A master legionnaire commands the opening lines with ruthless precision and iron discipline.'
      : 'The club legion advances through theory by steady practice, patience, and disciplined calculation.'
  };
  const currentRankFact = rankFacts[legion.title] || 'The legion marches onward when discipline and study are kept in balance.';

  return (
    <div className="color-choice page-transition">
      <div className="color-choice__wrap">
        <div className={`color-choice__status color-choice__status--${isMaster ? 'master' : 'club'}`}>
          <div className="color-choice__status-tag">
            {isMaster ? '★ Masters Legion' : '◆ Club Legion'}
          </div>

          <div className="color-choice__status-head">
            <RankBadge title={legion.title} icon={legion.icon} size="lg" active tone={isMaster ? 'var(--gold)' : 'var(--silver)'} />
            <div className="color-choice__status-titles">
              <div className="color-choice__status-source">{isMaster ? 'Master Campaign' : 'Club Campaign'}</div>
              <div className="color-choice__status-rank">{legion.title} ({merit} merit)</div>
            </div>
          </div>

          <div className="color-choice__progress-track">
            <div className="color-choice__progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="color-choice__progress-label">
            {legion.nextRank
              ? `${merit} merit · ${legion.pointsNeeded} to ${legion.nextRank}`
              : `${merit} merit · Highest rank attained`}
          </div>
        </div>

        <div className="color-choice__path-panel">
          <div className="color-choice__path-title">Road to Legatus</div>
          <LegionPath legion={legion} />
        </div>

        <div className="rank-banner color-choice__banner">
          <div className="rank-banner-image-wrap color-choice__banner-image-wrap">
            <img src={currentRankImage} alt={legion.title} className="rank-banner-img color-choice__banner-image" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>
          <div className="rank-banner-info color-choice__banner-info">
            <div className="rank-banner-title color-choice__banner-title">{legion.icon} {currentRankInfo.label}</div>
            <div className="rank-banner-text color-choice__banner-text">{currentRankInfo.text}</div>
            <div className="rank-fact">
              <div className="rank-fact-title">Did you know?</div>
              <div className="rank-fact-text">{currentRankFact}</div>
            </div>
          </div>
        </div>

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

        <div className="color-choice__start">
          <button className="menu-btn gold-btn color-choice__start-btn" type="button" onClick={() => app.startBattle()}>
            ⚔️ Start Battle
          </button>
        </div>
      </div>
    </div>
  );
}

export default ColorChoiceScreen;
