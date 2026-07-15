// components/GameScreen.jsx — the active battle screen: board, position info,
// hint button, and (once gameEnded) the EndGameSummary overlay.
// Mirrors renderGameContainer()/renderBoard()'s data/behavior exactly:
// gameCount text, hint button enabled/disabled + label logic, theory message
// visibility. Painting via JSX instead of innerHTML; no game-logic changes.
import { ChessBoard } from './ChessBoard';
import { Panel } from './Panel';
import { Button } from './Button';
import { EndGameSummary } from './EndGameSummary';
import { IconBrokenStandard, IconRomanTemple, IconReset, IconCircularLaurel, IconVexillum } from './RomanIcons';
import { legionVariant } from '../utils/legionVariant';
import './GameScreen.css';

export function GameScreen({ app }) {
  const isPlayerTurn = app.game.turn() === app.playerColor;
  const campaignVariant = legionVariant(app);
  const hintEnabled = app.mode === 'practice' ? !app.hintUsed : (isPlayerTurn && !app.hintUsed);

  const gameCountText = app.gameCount > 0
    ? `Position reached ${app.gameCount.toLocaleString()} times`
    : 'Position data unavailable – continuing...';

  if (app.apiErrorState) {
    return (
      <div className={`game-screen page-transition campaign-${campaignVariant}`}>
        <Panel className="game-screen__error">
          <h3><IconBrokenStandard className="game-screen__heading-icon" aria-hidden="true" /> Connection Lost</h3>
          <p>
            {app.apiErrorSource === 'eval'
              ? 'The evaluation engine is down right now. Try again in a few minutes.'
              : 'The opening database is unreachable right now. Please try again shortly.'}
          </p>
          <Button variant="secondary" onClick={() => app.goHome()}><IconRomanTemple className="game-screen__btn-icon" aria-hidden="true" /> Return Home</Button>
        </Panel>
      </div>
    );
  }

  return (
    <div className={`game-container page-transition campaign-${campaignVariant}`}>
      <div className="game-screen__board-area">
        <div className="war-table">
          <div className="war-table__corner war-table__corner--tl" aria-hidden="true" />
          <div className="war-table__corner war-table__corner--tr" aria-hidden="true" />
          <div className="war-table__corner war-table__corner--bl" aria-hidden="true" />
          <div className="war-table__corner war-table__corner--br" aria-hidden="true" />
          <ChessBoard app={app} />
        </div>
        {!app.gameEnded && (
          <div className="game-screen__info-line">{gameCountText}</div>
        )}

        {app.theoryMessageVisible && app.theoryMessage && (
          <Panel className="game-screen__theory-message">
            <div dangerouslySetInnerHTML={{ __html: app.theoryMessage }} />
          </Panel>
        )}

        {app.gameEnded && app.endGameData && (
          <EndGameSummary app={app} />
        )}

        {!app.gameEnded && (
          <div className="game-screen__actions">
            <Button variant={campaignVariant} size="sm" onClick={() => window.location.reload()}>
              <IconReset className="game-screen__btn-icon" aria-hidden="true" /> New Battle
            </Button>
            <Button
              variant={campaignVariant}
              size="sm"
              disabled={!hintEnabled}
              onClick={() => app.getHints()}
            >
              {app.hintUsed
                ? <><IconCircularLaurel className="game-screen__btn-icon" aria-hidden="true" /> Consulted</>
                : <><IconVexillum className="game-screen__btn-icon" aria-hidden="true" /> Consult Commander</>}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default GameScreen;
