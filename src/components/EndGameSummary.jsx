// components/EndGameSummary.jsx — post-battle results panel.
// Mirrors renderEndGameSummary() exactly: same rank-change message logic
// (read once then cleared — replicated via a ref so it doesn't reappear on
// re-render), same stat fields, same rank-color map, same conditional button
// set (PGN buttons hidden in practice mode), same Try Again behavior
// (re-enters practice opening or starts a new battle).
import { useState } from 'react';
import { Panel } from './Panel';
import { Button } from './Button';
import { BATTLE_RANK_COLORS } from './rankColors';
import { IconReset, IconStoneTablet, IconCrossedGladius, IconFortress } from './RomanIcons';
import { Scoring } from '../logic/scoring';
import './EndGameSummary.css';
import PromotionScreen from './PromotionScreen';

const RANK_COLORS = BATTLE_RANK_COLORS;
const RANK_ORDER = ['Levy', 'Hastatus', 'Principes', 'Triarius', 'Imperator'];

export function EndGameSummary({ app }) {
  // Read + clear rankChangeMessage exactly once, matching the legacy
  // `this.app.rankChangeMessage = null;` right after reading it for display.
  // useState's lazy initializer runs exactly once per mount, giving the same
  // "read once" semantics as the original ref pattern without reading a ref
  // during render (which the stricter react-hooks/refs rule disallows).
  const [{ rankChangeMessage, rankChangeType }] = useState(() => {
    const message = app.rankChangeMessage;
    const type = app.rankChangeType;
    app.rankChangeMessage = null;
    app.rankChangeType = null;
    return { rankChangeMessage: message, rankChangeType: type };
  });
  const isPromotion = rankChangeType === 'promotion';
  const [showPromotionScreen, setShowPromotionScreen] = useState(false);

  const { battleRank, moveQuality, displayEval, isPractice, gamesToShow } = app.endGameData;
  const rankColor = RANK_COLORS[battleRank.title] || '#d4af37';

  const handleTryAgain = () => {
    if (isPractice && app.practiceOpening) {
      app.startPracticeOpening(app.practiceOpening);
    } else {
      app.startBattle();
    }
  };

  return (
    <Panel className="end-summary">
      {/* Promotion trigger: show simple message and Join ceremony button */}
      {isPromotion ? (
        <div className="end-summary__rank-change end-summary__rank-change--promo">
          <div className="end-summary__promo-message">You have been promoted</div>
          {!showPromotionScreen && (
            <div className="end-summary__promo-cta">
              <Button className="join-ceremony" variant="primary" size="md" onClick={() => setShowPromotionScreen(true)}>Join ceremony</Button>
            </div>
          )}
        </div>
      ) : (
        rankChangeMessage && (
          <div
            className={'end-summary__rank-change end-summary__rank-change--demo'}
            dangerouslySetInnerHTML={{ __html: rankChangeMessage }}
          />
        )
      )}

      {isPractice && (
        <h3 className="end-summary__heading" style={{ color: rankColor, textShadow: `0 0 20px ${rankColor}` }}>
          <battleRank.icon className="end-summary__rank-icon" aria-hidden="true" /> {battleRank.title} — Practice Score: {battleRank.score}/100
        </h3>
      )}
      {!isPractice && <h3 className="end-summary__heading" style={{ color: rankColor, textShadow: `0 0 20px ${rankColor}` }}>
        <battleRank.icon className="end-summary__rank-icon" aria-hidden="true" /> {battleRank.title} • Score: {battleRank.score}/100
      </h3>}

      <div className="end-summary__stats">
        <div className="end-summary__stat">
          <span>Moves</span>
          <strong>{app.playerMoves}</strong>
        </div>
        <div className="end-summary__stat">
          <span>Book Move</span>
          <strong>{moveQuality}%</strong>
        </div>
        <div className="end-summary__stat">
          <span>Eval</span>
          <strong>{displayEval}</strong>
        </div>
      </div>

      {!isPractice && (
        <>
          <div className="end-summary__quote" style={{ color: rankColor }}>Commander says - "{battleRank.msg}"</div>
          <div className="end-summary__sub"><em>{battleRank.sub}</em></div>
        </>
      )}

      <div className="end-summary__ladder">
        {RANK_ORDER.map(r => {
          const color = RANK_COLORS[r];
          const isActive = r === battleRank.title;
          return (
            <div
              key={r}
              className={`end-summary__ladder-step ${isActive ? 'end-summary__ladder-step--active' : ''}`}
              style={isActive ? {
                background: `linear-gradient(135deg, ${color}, ${color})`,
                color: r === 'Hastatus' ? '#000' : '#fff',
                borderColor: color,
              } : undefined}
            >
              {r}
            </div>
          );
        })}
      </div>

      {/* Hide standard buttons when a promotion prompt is showing */}
      {!isPromotion && (
        <div className="end-summary__buttons">
          <Button variant="danger" size="sm" onClick={() => app.showAnalysis()}><IconStoneTablet className="end-summary__btn-icon" aria-hidden="true" /> Analyze</Button>
          {isPractice ? (
            <Button variant="danger" size="sm" onClick={handleTryAgain}><IconReset className="end-summary__btn-icon" aria-hidden="true" /> Try Again</Button>
          ) : (
            <Button variant="danger" size="sm" onClick={() => app.returnToCampaign()}><IconCrossedGladius className="end-summary__btn-icon" aria-hidden="true" /> Continue Campaign</Button>
          )}
          <Button variant="danger" size="sm" onClick={() => app.goHome()}><IconFortress className="end-summary__btn-icon" aria-hidden="true" /> Exit</Button>
        </div>
      )}

      {isPractice && (
        <div className="end-summary__practice-note">
          Practice games do not affect campaign merit, rank, game history, or PGN export.
        </div>
      )}

      {gamesToShow && gamesToShow.length > 0 && (
        <div className="end-summary__history">
          <div className="end-summary__history-title">Historical games from this position:</div>
          <div className="end-summary__history-list">
            {gamesToShow.map((game, idx) => {
              const whitePlayer = game.white?.name || 'Unknown';
              const blackPlayer = game.black?.name || 'Unknown';
              const whiteRating = game.white?.rating || '?';
              const blackRating = game.black?.rating || '?';
              const year = game.year || '';
              const gameId = game.id || '';
              const gameUrl = gameId ? `https://lichess.org/${gameId}` : '#';
              const resultText = game.winner === 'white' ? '1-0' : game.winner === 'black' ? '0-1' : '½-½';
              const resultColor = game.winner === 'white' ? '#fff' : game.winner === 'black' ? '#ccc' : '#f1c40f';
              return (
                <div key={idx} className="end-summary__history-item">
                  <div className="end-summary__history-meta">
                    <strong>{idx + 1}.</strong> {whitePlayer} ({whiteRating}) – {blackPlayer} ({blackRating}){year ? `, ${year}` : ''}
                  </div>
                  <div className="end-summary__history-actions">
                    <span className="end-summary__history-result" style={{ color: resultColor }}>{resultText}</span>
                    {gameId && (
                      <a href={gameUrl} target="_blank" rel="noopener noreferrer">View ↗</a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showPromotionScreen && (() => {
        // The promotion ceremony is about the campaign Legion rank
        // (Recruit -> Legionary -> Optio -> Centurion -> Tribunus -> Legatus),
        // which is a different scale entirely from `battleRank` (that's the
        // per-battle performance rank: Levy/Hastatus/Principes/Triarius/
        // Imperator). Deriving prev/new Legion rank from merit directly,
        // via the same rankOrder Scoring.getLegionRank() already returns.
        const meritKey = `${app.aiSource}_merit`;
        const currentMerit = app.legionMerits?.[meritKey] || 0;
        const newLegion = Scoring.getLegionRank(currentMerit);
        const prevLegionTitle = newLegion.level > 0 ? newLegion.rankOrder[newLegion.level - 1] : newLegion.title;
        return (
          <PromotionScreen
            onContinue={() => { setShowPromotionScreen(false); app.returnToCampaign(); }}
            onExit={() => { setShowPromotionScreen(false); app.goHome(); }}
            commanderName={app.commanderName || 'COMMANDER VALERIUS'}
            prevRank={prevLegionTitle}
            newRank={newLegion.title}
          />
        );
      })()}
    </Panel>
  );
}

export default EndGameSummary;
