// components/ScoreTester.jsx — PGN Score Tester (testing utility).
//
// Lets you upload/paste an already-played PGN, pick which explorer to score
// it against (Master/Club) and which side you played, then runs the exact
// same move-quality + final-scoring analysis a live battle runs (see
// logic/scoreTester.js) — without having to play the game move by move in
// the UI. Useful for sanity-checking the scoring mechanism against real
// games with a known outcome.
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { BATTLE_RANK_COLORS } from './rankColors';
import { analyzePgnBattle } from '../logic/scoreTester';
import './CaptureModal.css';
import './ScoreTester.css';

const STOP_REASON_LABEL = {
  'thin-theory': 'Explorer book ran dry here — this is where a live battle would have stopped.',
  'game-over': 'The game ended here (checkmate/stalemate/draw).',
  'end-of-pgn': 'Reached the end of the uploaded PGN without the explorer book running dry.',
};

export function ScoreTester({ onClose }) {
  const [pgnText, setPgnText] = useState('');
  const [fileName, setFileName] = useState('');
  const [aiSource, setAiSource] = useState('lichess'); // 'lichess' = Club, 'master' = Master
  const [playerColor, setPlayerColor] = useState('w');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [showLog, setShowLog] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    setPgnText(text);
    setFileName(file.name);
  };

  const handleRun = async () => {
    setError('');
    setResult(null);
    setLoading(true);
    setProgress({ done: 0, total: 0 });
    try {
      const res = await analyzePgnBattle({
        pgn: pgnText,
        aiSource,
        playerColor,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      if (!res.success) {
        setError(res.error);
      } else {
        setResult(res);
      }
    } catch (e) {
      console.error('Score tester error:', e);
      setError('Something went wrong running the analysis. Check the console for details.');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const rankColor = result ? (BATTLE_RANK_COLORS[result.battleRank.title] || '#d4af37') : null;

  return createPortal(
    <div className="capture-modal campaign-bronze" role="dialog" aria-modal="true" aria-labelledby="score-tester-title">
      <div className="capture-modal__backdrop" onClick={onClose} />
      <div className="capture-modal__panel score-tester__panel">
        <h2 id="score-tester-title" className="capture-modal__title">PGN Score Tester</h2>
        <p className="score-tester__intro">
          Upload or paste an already-played game. This runs the exact same move-quality and
          final-scoring analysis a live battle runs, stopping at the same point the explorer
          book would run dry — even if the game itself continued further.
        </p>

        <label className="capture-modal__field">
          <span>PGN</span>
          <textarea
            className="score-tester__textarea"
            value={pgnText}
            onChange={e => { setPgnText(e.target.value); setFileName(''); }}
            placeholder="Paste PGN move text here, or upload a .pgn file below…"
            rows={7}
          />
        </label>

        <div className="score-tester__upload-row">
          <Button variant="bronze" size="sm" onClick={handleFileClick}>Upload .pgn File</Button>
          {fileName && <span className="score-tester__filename">{fileName}</span>}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pgn,text/plain"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>

        <div className="capture-modal__field">
          <span>Score against</span>
          <div className="capture-modal__radio-row">
            <label>
              <input
                type="radio"
                name="score-tester-source"
                value="lichess"
                checked={aiSource === 'lichess'}
                onChange={() => setAiSource('lichess')}
              />
              Club
            </label>
            <label>
              <input
                type="radio"
                name="score-tester-source"
                value="master"
                checked={aiSource === 'master'}
                onChange={() => setAiSource('master')}
              />
              Master
            </label>
          </div>
        </div>

        <div className="capture-modal__field">
          <span>You played</span>
          <div className="capture-modal__radio-row">
            <label>
              <input
                type="radio"
                name="score-tester-color"
                value="w"
                checked={playerColor === 'w'}
                onChange={() => setPlayerColor('w')}
              />
              White
            </label>
            <label>
              <input
                type="radio"
                name="score-tester-color"
                value="b"
                checked={playerColor === 'b'}
                onChange={() => setPlayerColor('b')}
              />
              Black
            </label>
          </div>
        </div>

        {error && <div className="capture-modal__error">{error}</div>}

        <div className="capture-modal__actions">
          <Button variant="bronze" size="md" onClick={handleRun} disabled={loading || !pgnText.trim()}>
            {loading
              ? (progress && progress.total ? `Analyzing move ${progress.done}/${progress.total}…` : 'Analyzing…')
              : 'Run Analysis'}
          </Button>
          <Button variant="ghost" size="md" onClick={onClose}>Close</Button>
        </div>

        {result && (
          <div className="score-tester__result">
            <h3
              className="score-tester__result-heading"
              style={{ color: rankColor, textShadow: `0 0 16px ${rankColor}` }}
            >
              <result.battleRank.icon className="score-tester__result-icon" aria-hidden="true" />
              {' '}{result.battleRank.title} • Score: {result.score}/100
            </h3>

            <div className="score-tester__stats">
              <div className="score-tester__stat">
                <span>Moves (Depth)</span>
                <strong>{result.playerMoves}</strong>
              </div>
              <div className="score-tester__stat">
                <span>Top Moves</span>
                <strong>{result.topMoveChoices}/{result.qualityTrackedMoves} ({result.moveQuality}%)</strong>
              </div>
              <div className="score-tester__stat">
                <span>Final Eval</span>
                <strong>{result.displayEval}</strong>
              </div>
            </div>

            <div className="score-tester__stop-note">
              Stopped at move {result.stoppedAtMoveLabel} (ply {result.stopPly} of {result.totalPgnPlies} in the uploaded PGN).
              {' '}{STOP_REASON_LABEL[result.stopReason]}
            </div>

            {result.penaltyReason && (
              <div className="score-tester__penalty-note">{result.penaltyReason}</div>
            )}

            {result.shortSkirmishApplied && (
              <div className="score-tester__short-skirmish-note">
                <strong>Short Skirmish</strong> — The battle ended before the legion could prove its discipline.
              </div>
            )}

            <button
              type="button"
              className="score-tester__log-toggle"
              onClick={() => setShowLog(s => !s)}
            >
              {showLog ? 'Hide' : 'Show'} move-by-move breakdown
            </button>

            {showLog && (
              <div className="score-tester__log">
                {result.moveLog.map((entry) => (
                  <div
                    key={entry.ply}
                    className={`score-tester__log-row ${entry.isPlayerMove ? 'score-tester__log-row--player' : ''} ${entry.counted ? 'score-tester__log-row--counted' : ''}`}
                  >
                    <span className="score-tester__log-move">{entry.moveNumber} {entry.san}</span>
                    {entry.isPlayerMove && (
                      <span className="score-tester__log-note">{entry.note}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default ScoreTester;
