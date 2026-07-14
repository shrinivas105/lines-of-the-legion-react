// components/AnalysisScreen.jsx — post-battle analysis board.
// Mirrors renderAnalysisBoard()/renderBoard()/renderMoveList()/
// renderComparisonTable()/drawMoveArrows() exactly: same board-flip logic,
// same move-list grid + active highlighting + robot indicator for non-player
// moves, same comparison table columns/colors, same arrow color/width/dash
// rules and pixel math (shortenBy=20, headLength=15, headAngle=PI/6).
// All underlying data comes from app.analysisBoard (AnalysisBoard class) —
// no analysis logic is reimplemented here, only painted as JSX/SVG.
import { useEffect, useRef, useState } from 'react';
import { Panel } from './Panel';
import { Button } from './Button';
import { IconCornu, IconCrossedGladius, IconPlayedMark } from './RomanIcons';
import './AnalysisScreen.css';

function squareToCoords(square, isFlipped, squareSize) {
  const file = square.charCodeAt(0) - 97;
  const rank = 8 - parseInt(square[1]);
  const displayFile = isFlipped ? 7 - file : file;
  const displayRank = isFlipped ? 7 - rank : rank;
  return { x: (displayFile + 0.5) * squareSize, y: (displayRank + 0.5) * squareSize };
}

function arrowGeometry(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.atan2(dy, dx);
  const length = Math.sqrt(dx * dx + dy * dy);
  const shortenBy = 20;
  const adjustedLength = length - shortenBy;
  const startX = from.x + Math.cos(angle) * (shortenBy / 2);
  const startY = from.y + Math.sin(angle) * (shortenBy / 2);
  const endX = startX + Math.cos(angle) * adjustedLength;
  const endY = startY + Math.sin(angle) * adjustedLength;
  const headLength = 15;
  const headAngle = Math.PI / 6;
  const head1X = endX - headLength * Math.cos(angle - headAngle);
  const head1Y = endY - headLength * Math.sin(angle - headAngle);
  const head2X = endX - headLength * Math.cos(angle + headAngle);
  const head2Y = endY - headLength * Math.sin(angle + headAngle);
  return { startX, startY, endX, endY, head1X, head1Y, head2X, head2Y };
}

function ArrowSvg({ arrows, isFlipped, boardSize }) {
  const squareSize = boardSize / 8;
  return (
    <svg className="analysis-arrows" viewBox={`0 0 ${boardSize} ${boardSize}`} shapeRendering="geometricPrecision">
      {arrows.map((arrow, i) => {
        const from = squareToCoords(arrow.from, isFlipped, squareSize);
        const to = squareToCoords(arrow.to, isFlipped, squareSize);
        const g = arrowGeometry(from, to);

        return (
          <g key={i}>
            {/* dark halo underneath for crisp contrast on any square color */}
            <line x1={g.startX} y1={g.startY} x2={g.endX} y2={g.endY}
              stroke="#000" strokeWidth={arrow.width + 3} strokeLinecap="round" opacity={0.35} />
            <line x1={g.startX} y1={g.startY} x2={g.endX} y2={g.endY}
              stroke={arrow.color} strokeWidth={arrow.width} strokeLinecap="round"
              strokeDasharray={arrow.dashed ? '8,4' : undefined} />
            <polygon points={`${g.endX},${g.endY} ${g.head1X},${g.head1Y} ${g.head2X},${g.head2Y}`}
              fill={arrow.color} stroke="#000" strokeWidth={2.5} strokeOpacity={0.35} strokeLinejoin="round" />
          </g>
        );
      })}
    </svg>
  );
}

function AnalysisBoardGrid({ app, boardSize, setBoardSize }) {
  const wrapRef = useRef(null);
  const ab = app.analysisBoard;
  const board = ab.analysisGame.board();
  const isFlipped = app.playerColor === 'b';
  const rendered = isFlipped ? board.slice().reverse().map(r => r.slice().reverse()) : board;

  useEffect(() => {
    if (wrapRef.current) setBoardSize(wrapRef.current.offsetWidth);
  }, [setBoardSize]);

  return (
    <div className="analysis-board-wrap" ref={wrapRef}>
      <div className="analysis-board-grid">
        {rendered.map((row, r) =>
          row.map((square, c) => {
            const actualRow = isFlipped ? 7 - r : r;
            const actualCol = isFlipped ? 7 - c : c;
            const isLight = (actualRow + actualCol) % 2 === 0;
            return (
              <div key={`${r}-${c}`} className={`analysis-square ${isLight ? 'light' : 'dark'}`}>
                {square && (
                  <img
                    src={app.pieceImages[square.color + square.type]}
                    alt={square.type}
                    className="analysis-piece"
                  />
                )}
              </div>
            );
          })
        )}
      </div>
      {boardSize > 0 && <ArrowSvg arrows={ab.arrows} isFlipped={isFlipped} boardSize={boardSize} />}
    </div>
  );
}

function MoveList({ app }) {
  const ab = app.analysisBoard;
  if (ab.moveHistory.length === 0) {
    return <div className="analysis-movelist__empty">No moves yet</div>;
  }
  const isWhitePlayer = app.playerColor === 'w';
  const rows = [];
  for (let i = 0; i < ab.moveHistory.length; i += 2) {
    const moveNum = Math.floor(i / 2) + 1;
    const whiteMove = ab.moveHistory[i];
    const blackMove = ab.moveHistory[i + 1];
    rows.push(
      <div className="analysis-movelist__row" key={i}>
        <button
          className={`analysis-movelist__item ${ab.currentMoveIndex === i ? 'active' : ''} ${!isWhitePlayer ? 'dim' : ''}`}
          onClick={() => ab.goToMove(i + 1)}
        >
          {moveNum}. {whiteMove.san}{isWhitePlayer ? '' : <IconCornu className="analysis-movelist__icon" aria-hidden="true" />}
        </button>
        {blackMove ? (
          <button
            className={`analysis-movelist__item ${ab.currentMoveIndex === i + 1 ? 'active' : ''} ${isWhitePlayer ? 'dim' : ''}`}
            onClick={() => ab.goToMove(i + 2)}
          >
            {blackMove.san}{!isWhitePlayer ? '' : <IconCornu className="analysis-movelist__icon" aria-hidden="true" />}
          </button>
        ) : <div />}
      </div>
    );
  }
  return <div className="analysis-movelist">{rows}</div>;
}

function ComparisonTable({ app }) {
  const ab = app.analysisBoard;
  if (ab.currentMoveIndex < 0) {
    return <div className="analysis-compare__placeholder">Navigate to a position to see move analysis</div>;
  }
  if (ab.tableData.length === 0) {
    return <div className="analysis-compare__placeholder">{ab.positionText}</div>;
  }
  return (
    <div className="analysis-compare">
      <div className="analysis-compare__head">
        <span className="analysis-compare__head-label">Move Comparison</span>
        <div className="analysis-compare__head-meta">
          <span>{ab.positionText}</span>
          <span style={{ color: ab.currentEvalColor }}>{ab.evalText}</span>
        </div>
      </div>
      <table className="analysis-compare__table">
        <colgroup>
          <col className="col-move" />
          <col className="col-num" />
          <col className="col-num" />
          <col className="col-num" />
          <col className="col-num" />
          <col className="col-num" />
        </colgroup>
        <thead>
          <tr>
            <th>Move</th><th>White Win</th><th>Black Win</th><th>Draw</th><th>Games</th><th>Eval</th>
          </tr>
        </thead>
        <tbody>
          {ab.tableData.map((row, i) => (
            <tr
              key={i}
              className={row.isCurrentMove ? 'current' : ''}
              style={{ borderLeft: `3px solid ${row.color}` }}
            >
              <td className="analysis-compare__move-cell">
                <span style={{ color: row.color, fontWeight: 'bold' }}>{row.label}:</span>
                <span className="analysis-compare__move-text">{row.move}</span>
                {row.isCurrentMove ? (
                  <span
                    className="analysis-compare__played-mark"
                    style={{ color: row.moveType === 'Your' ? 'var(--gold)' : 'var(--oxblood-text)' }}
                    title={row.moveType === 'Your' ? 'Move you played' : "Opponent's move"}
                  >
                    <IconPlayedMark className="analysis-compare__icon" />
                  </span>
                ) : null}
              </td>
              <td>{row.whiteWin}%</td>
              <td>{row.blackWin}%</td>
              <td className="draw">{row.draws}%</td>
              <td className="games">{row.totalGames.toLocaleString()}</td>
              <td style={{ color: row.evalColor, fontWeight: 'bold' }}>{row.eval}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AnalysisScreen({ app }) {
  const [boardSize, setBoardSize] = useState(0);
  const ab = app.analysisBoard;

  if (app.analysisLoading) {
    return (
      <div className="analysis-loading">
        <IconCrossedGladius className="analysis-loading__icon" aria-hidden="true" />
        <div className="analysis-loading__title">Analyzing Battle...</div>
        <div className="analysis-loading__message">{ab.preloadMessage || 'Evaluating all positions...'}</div>
        <div className="analysis-loading__bar-track">
          <div className="analysis-loading__bar-fill" style={{ width: `${ab.preloadProgress}%` }} />
        </div>
        <div className="analysis-loading__pct">{ab.preloadProgress}%</div>
      </div>
    );
  }

  return (
    <div className="analysis-screen page-transition">
      <h2 className="analysis-screen__title"><IconCrossedGladius className="analysis-screen__title-icon" aria-hidden="true" /> Battle Analysis <IconCrossedGladius className="analysis-screen__title-icon" aria-hidden="true" /></h2>

      <AnalysisBoardGrid app={app} boardSize={boardSize} setBoardSize={setBoardSize} />

      <Panel className="analysis-screen__compare-panel">
        <ComparisonTable app={app} />
      </Panel>

      <div className="analysis-screen__nav">
        <Button variant="danger" size="sm" disabled={ab.currentMoveIndex < 0} onClick={() => ab.goToMove(0)}>First</Button>
        <Button variant="danger" size="sm" disabled={ab.currentMoveIndex < 0} onClick={() => ab.previousMove()}>Prev</Button>
        <Button variant="danger" size="sm" disabled={ab.currentMoveIndex >= ab.moveHistory.length - 1} onClick={() => ab.nextMove()}>Next</Button>
        <Button variant="danger" size="sm" disabled={ab.currentMoveIndex >= ab.moveHistory.length - 1} onClick={() => ab.goToMove(ab.moveHistory.length)}>Last</Button>
      </div>

      <Panel className="analysis-screen__legend">
        <div className="analysis-screen__legend-row">
          <span className="analysis-screen__legend-label">Arrows:</span>
          <LegendSwatch color="#2ecc71" label="Top" />
          <LegendSwatch color="#f1c40f" label="2nd" />
          <LegendSwatch color="#e67e22" label="3rd" />
          <LegendSwatch color="#3498db" label="Your move (not top 3)" />
        </div>
      </Panel>

      <div className="analysis-screen__actions">
        <Button variant="danger" size="sm" onClick={() => app.analysisBoard.exitAnalysis()}>Exit</Button>
        <Button variant="danger" size="sm" onClick={() => app.downloadPGN()}>Download PGN</Button>
      </div>
    </div>
  );
}

function LegendSwatch({ color, opacity = 1, label }) {
  return (
    <div className="analysis-screen__swatch">
      <div className="analysis-screen__swatch-line" style={{ background: color, opacity }} />
      <span>{label}</span>
    </div>
  );
}

export default AnalysisScreen;
