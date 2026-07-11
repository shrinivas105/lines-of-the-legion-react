// components/ChessBoard.jsx — renders the 8x8 board and handles interaction.
// Move-handling logic (click-to-move, drag-to-move, legal-move highlighting,
// board flipping for Black) is delegated entirely to app.handleClick /
// app.handleDragMove / app.game.moves(...) — i.e. the exact same logic as the
// legacy renderBoard() in ui-renderer.js. This component only differs in HOW
// it paints (JSX instead of raw DOM creation); the move logic itself is
// untouched and lives in chessTheoryApp.js.
import { useEffect, useMemo, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import './ChessBoard.css';

function algebraicToCoords(square) {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  return { row: 8 - rank, col: file };
}

// react-chessboard v5's `pieces` option keys are formatted as lowercase
// color + uppercase piece letter (e.g. "wP", "bK") — not all-uppercase.
// app.pieceImages keys come from chessApi.js as all-lowercase ("wp", "bk").
function toReactChessboardPieceKey(pieceKey) {
  if (!pieceKey) return null;
  return pieceKey[0].toLowerCase() + pieceKey[1].toUpperCase();
}

// react-chessboard v5 rewrote the piece renderer signature: instead of
// receiving `{ squareWidth }` it receives `{ square, fill, svgStyle }` and
// the board itself controls sizing via CSS, not a `squareWidth` px value.
// We just render the image to fill its square via CSS instead.
function CustomPieceImage({ src }) {
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}

export function ChessBoard({ app }) {
  const [boardWidth, setBoardWidth] = useState(520);
  const isPlayerTurn = app.game.turn() === app.playerColor;

  const legalTargets = useMemo(() => {
    return app.selected
      ? new Set(app.game.moves({ square: app.selected, verbose: true }).map(m => m.to))
      : new Set();
  }, [app.selected, app.game]);

  useEffect(() => {
    const updateBoardWidth = () => {
      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 520;
      setBoardWidth(Math.min(560, Math.max(300, viewportWidth - 28)));
    };

    updateBoardWidth();
    window.addEventListener('resize', updateBoardWidth);
    return () => window.removeEventListener('resize', updateBoardWidth);
  }, []);

  const customSquareStyles = useMemo(() => {
    const styles = {};

    if (app.selected) {
      styles[app.selected] = {
        boxShadow: 'inset 0 0 0 4px rgba(255, 215, 0, 0.95), inset 0 0 0 9999px rgba(255, 215, 0, 0.16)',
      };
    }

    if (app.lastMove?.from) {
      styles[app.lastMove.from] = {
        ...styles[app.lastMove.from],
        background: 'linear-gradient(135deg, rgba(32, 78, 170, 0.42), rgba(32, 78, 170, 0.18))',
      };
    }

    if (app.lastMove?.to) {
      styles[app.lastMove.to] = {
        ...styles[app.lastMove.to],
        background: 'linear-gradient(135deg, rgba(32, 78, 170, 0.48), rgba(32, 78, 170, 0.22))',
      };
    }

    legalTargets.forEach((target) => {
      styles[target] = {
        ...styles[target],
        backgroundImage: 'radial-gradient(circle, rgba(255, 255, 255, 0.95) 15%, rgba(255, 255, 255, 0) 16%)',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
      };
    });

    return styles;
  }, [app.lastMove, app.selected, legalTargets]);

  // v5's `pieces` option expects components that take { square, fill,
  // svgStyle }, not { squareWidth } — sizing is handled by CSS now.
  const customPieces = useMemo(() => {
    return Object.entries(app.pieceImages || {}).reduce((acc, [pieceKey, src]) => {
      acc[toReactChessboardPieceKey(pieceKey)] = () => <CustomPieceImage src={src} />;
      return acc;
    }, {});
  }, [app.pieceImages]);

  // v5 handlers receive a single args object instead of positional params.
  const handleSquareClick = ({ square }) => {
    const { row, col } = algebraicToCoords(square);
    app.handleClick(row, col);
  };

  const handlePieceDrop = ({ sourceSquare, targetSquare }) => {
    if (!targetSquare) return false;
    const isLegal = app.game.moves({ from: sourceSquare, to: targetSquare, verbose: true }).length > 0;
    if (!isLegal || !isPlayerTurn) return false;

    app.handleDragMove(sourceSquare, targetSquare);
    return true;
  };

  // react-chessboard v5 takes a single `options` object instead of many
  // top-level props (onSquareClick -> onSquareClick, onPieceDrop stays,
  // boardWidth was removed in favor of CSS-driven sizing, customSquareStyles
  // -> squareStyles, arePiecesDraggable -> allowDragging, customPieces ->
  // pieces, areArrowsAllowed -> allowDrawingArrows, customBoardStyle ->
  // boardStyle, animationDuration -> animationDurationInMs).
  const chessboardOptions = {
    position: app.game.fen(),
    onSquareClick: handleSquareClick,
    onPieceDrop: handlePieceDrop,
    boardOrientation: app.playerColor === 'b' ? 'black' : 'white',
    squareStyles: customSquareStyles,
    animationDurationInMs: 180,
    allowDragging: isPlayerTurn,
    allowDrawingArrows: false,
    pieces: customPieces,
    boardStyle: {
      borderRadius: '16px',
      boxShadow: '0 24px 70px rgba(0, 0, 0, 0.72)',
      overflow: 'hidden',
      background: '#1b120d',
    },
  };

  return (
    <div className="board-shell" id="board">
      <div style={{ width: boardWidth, height: boardWidth }}>
        <Chessboard options={chessboardOptions} />
      </div>
    </div>
  );
}

export default ChessBoard;
