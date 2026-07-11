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
import './EndGameSummary.css';

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
      {rankChangeMessage && (
        <div className={isPromotion ? 'end-summary__rank-change end-summary__rank-change--promo' : 'end-summary__rank-change end-summary__rank-change--demo'}>
          {rankChangeMessage}
        </div>
      )}

      <h3 className="end-summary__heading" style={{ color: rankColor, textShadow: `0 0 20px ${rankColor}` }}>
        {battleRank.icon} {battleRank.title} • Score: {battleRank.score}/100
      </h3>

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

      <div className="end-summary__quote" style={{ color: rankColor }}>Commander says - "{battleRank.msg}"</div>
      <div className="end-summary__sub"><em>{battleRank.sub}</em></div>

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

      <div className="end-summary__buttons">
        <Button variant="danger" size="sm" onClick={() => app.showAnalysis()}>📊 Analyze</Button>
        {isPractice ? (
          <Button variant="danger" size="sm" onClick={handleTryAgain}>🔄 Try Again</Button>
        ) : (
          <Button variant="danger" size="sm" onClick={() => app.startBattle()}>⚔️ Continue Campaign</Button>
        )}
        <Button variant="danger" size="sm" onClick={() => app.goHome()}>🚪 Exit</Button>
      </div>

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
    </Panel>
  );
}

export default EndGameSummary;
