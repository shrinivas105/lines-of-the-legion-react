// components/ChessBoard.jsx — renders the 8x8 board and handles interaction.
// Move-handling logic (click-to-move, drag-to-move, legal-move highlighting,
// board flipping for Black) is delegated entirely to app.handleClick /
// app.handleDragMove / app.game.moves(...) — i.e. the exact same logic as the
// legacy renderBoard() in ui-renderer.js. This component only differs in HOW
// it paints (JSX instead of raw DOM creation); the move logic itself is
// untouched and lives in chessTheoryApp.js.
import { useMemo, useState } from 'react';
import './ChessBoard.css';

export function ChessBoard({ app }) {
  const [dragOverSquare, setDragOverSquare] = useState(null);
  const board = app.game.board();
  const isFlipped = app.playerColor === 'b';
  const renderedBoard = isFlipped ? board.slice().reverse().map(r => r.slice().reverse()) : board;
  const isPlayerTurn = app.game.turn() === app.playerColor;

  const legalTargets = useMemo(() => {
    return app.selected
      ? new Set(app.game.moves({ square: app.selected, verbose: true }).map(m => m.to))
      : new Set();
  }, [app.selected, app.game]);

  return (
    <div className="board-wrapper" id="board">
      {renderedBoard.map((row, r) =>
        row.map((square, c) => {
          const actualRow = isFlipped ? 7 - r : r;
          const actualCol = isFlipped ? 7 - c : c;
          const sqName = 'abcdefgh'[actualCol] + (8 - actualRow);
          const isLight = (actualRow + actualCol) % 2 === 0;
          const isSelected = app.selected === sqName;
          const isLastMove = app.lastMove.from === sqName || app.lastMove.to === sqName;
          const isMoveTarget = legalTargets.has(sqName);
          const isDragOver = dragOverSquare === sqName;

          return (
            <div
              key={sqName}
              className={[
                'square',
                isLight ? 'light' : 'dark',
                isSelected ? 'selected' : '',
                isLastMove ? 'last-move' : '',
                isMoveTarget ? 'move-target' : '',
                !isPlayerTurn ? 'disabled' : '',
                isDragOver ? 'drag-over' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => app.handleClick(actualRow, actualCol)}
              onMouseDown={(e) => e.preventDefault()}
              onDragOver={(e) => {
                if (isPlayerTurn && app.dragSource) e.preventDefault();
              }}
              onDragEnter={(e) => {
                if (isPlayerTurn && app.dragSource) {
                  e.preventDefault();
                  setDragOverSquare(sqName);
                }
              }}
              onDragLeave={() => setDragOverSquare(null)}
              onDrop={(e) => {
                if (!isPlayerTurn || !app.dragSource) return;
                e.preventDefault();
                setDragOverSquare(null);
                const source = app.dragSource;
                app.handleDragMove(source, sqName);
              }}
            >
              {square && (
                <img
                  src={app.pieceImages[square.color + square.type]}
                  className="piece"
                  alt={`${square.color}${square.type}`}
                  draggable={isPlayerTurn && square.color === app.playerColor}
                  onDragStart={(e) => {
                    if (!isPlayerTurn || square.color !== app.playerColor) {
                      e.preventDefault();
                      return;
                    }
                    app.dragSource = sqName;
                    e.dataTransfer.setData('text/plain', sqName);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => {
                    app.dragSource = null;
                  }}
                />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

export default ChessBoard;
