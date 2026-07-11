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

function toReactChessboardPieceKey(pieceKey) {
  if (!pieceKey) return null;
  return pieceKey[0].toUpperCase() + pieceKey[1].toUpperCase();
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

  const customPieces = useMemo(() => {
    return Object.entries(app.pieceImages || {}).reduce((acc, [pieceKey, src]) => {
      acc[toReactChessboardPieceKey(pieceKey)] = ({ squareWidth }) => (
        <img
          src={src}
          alt=""
          draggable={false}
          style={{ width: squareWidth, height: squareWidth }}
        />
      );
      return acc;
    }, {});
  }, [app.pieceImages]);

  const handleSquareClick = (square) => {
    const { row, col } = algebraicToCoords(square);
    app.handleClick(row, col);
  };

  const handlePieceDrop = (sourceSquare, targetSquare) => {
    const isLegal = app.game.moves({ from: sourceSquare, to: targetSquare, verbose: true }).length > 0;
    if (!isLegal || !isPlayerTurn) return false;

    app.handleDragMove(sourceSquare, targetSquare);
    return true;
  };

  return (
    <div className="board-shell" id="board">
      <Chessboard
        position={app.game.fen()}
        onSquareClick={handleSquareClick}
        onPieceDrop={handlePieceDrop}
        boardOrientation={app.playerColor === 'b' ? 'black' : 'white'}
        boardWidth={boardWidth}
        customSquareStyles={customSquareStyles}
        animationDuration={180}
        arePiecesDraggable={isPlayerTurn}
        areArrowsAllowed={false}
        customPieces={customPieces}
        customBoardStyle={{
          borderRadius: '16px',
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.72)',
          overflow: 'hidden',
          background: '#1b120d',
        }}
      />
    </div>
  );
}

export default ChessBoard;
