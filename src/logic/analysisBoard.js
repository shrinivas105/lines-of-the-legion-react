// logic/analysisBoard.js - Post-game analysis with move navigation
// Converted from analysis-board.js
// CORE LOGIC PRESERVED VERBATIM: preloadAllData, goToMove, nextMove, previousMove,
// updateEvaluation, updateMoveComparison (data calc), arrow coordinate math.
// REMOVED: direct DOM manipulation (renderAnalysisBoard/renderBoard/renderMoveList/
// renderComparisonTable/drawMoveArrows HTML+DOM painting) — these are now handled by
// React components (AnalysisBoardView.jsx) which read this class's data fields.
// This class still computes `this.currentEval`, `this.currentEvalColor`,
// `this.tableData`, `this.positionText`, `this.evalText` etc. exactly as before;
// components simply render them instead of innerHTML.

import { Chess } from 'chess.js';
import { ChessAPI } from '../services/chessApi';

export class AnalysisBoard {
  constructor(app) {
    this.app = app;
    this.analysisGame = null;
    this.moveHistory = [];
    this.currentMoveIndex = -1;
    this.isAnalyzing = false;
    this.topMovesData = {};
    this.evaluationCache = {};
    this.analysisStartFen = null;

    // Derived display data (computed by updatePositionInfo / updateMoveComparison)
    this.currentEval = null;
    this.currentEvalColor = '#f1c40f';
    this.tableData = [];
    this.positionText = 'Starting Position';
    this.evalText = '';
    this.arrows = []; // computed arrow descriptors for SVG rendering
    this.preloadProgress = 0;
    this.preloadMessage = '';
  }

  async preloadAllData() {
    const tempGame = this.analysisStartFen ? new Chess(this.analysisStartFen) : new Chess();
    const totalPositions = this.moveHistory.length + 1;
    let processedPositions = 0;

    const updateProgress = () => {
      processedPositions++;
      const percentage = Math.round((processedPositions / totalPositions) * 100);
      this.preloadProgress = percentage;
      if (percentage < 30) {
        this.preloadMessage = 'Fetching move database...';
      } else if (percentage < 70) {
        this.preloadMessage = 'Calculating evaluations...';
      } else {
        this.preloadMessage = 'Finalizing analysis...';
      }
      if (this.app && this.app._notify) this.app._notify();
    };

    for (let i = 0; i <= this.moveHistory.length; i++) {
      const positionFen = tempGame.fen();

      if (!this.topMovesData[positionFen]) {
        try {
          const data = await ChessAPI.queryExplorer(this.app.aiSource, positionFen);
          this.topMovesData[positionFen] = data.moves || [];

          if (i < this.moveHistory.length) {
            const isWhiteMove = i % 2 === 0;
            const isPlayerMove = (this.app.playerColor === 'w' && isWhiteMove) ||
                                 (this.app.playerColor === 'b' && !isWhiteMove);

            const topMoves = this.topMovesData[positionFen].slice(0, 3);

            if (isPlayerMove) {
              for (const move of topMoves) {
                const evalKey = `${positionFen}_${move.uci}`;
                if (!this.evaluationCache[evalKey]) {
                  const evalGame = new Chess(positionFen);
                  const moveFrom = move.uci.substring(0, 2);
                  const moveTo = move.uci.substring(2, 4);
                  const movePromotion = move.uci.length > 4 ? move.uci[4] : undefined;

                  evalGame.move({ from: moveFrom, to: moveTo, promotion: movePromotion });
                  const evalFen = evalGame.fen();

                  try {
                    const rawEval = await ChessAPI.getEvaluation(evalFen, this.app.evalCache);
                    this.evaluationCache[evalKey] = rawEval;
                  } catch (err) {
                    console.error('Error preloading eval:', err);
                    this.evaluationCache[evalKey] = null;
                  }
                }
              }
            } else {
              const actualMove = this.moveHistory[i];
              const actualMoveUci = actualMove.from + actualMove.to + (actualMove.promotion || '');
              const evalKey = `${positionFen}_${actualMoveUci}`;

              if (!this.evaluationCache[evalKey]) {
                tempGame.move({
                  from: actualMove.from,
                  to: actualMove.to,
                  promotion: actualMove.promotion
                });
                const evalFen = tempGame.fen();

                try {
                  const rawEval = await ChessAPI.getEvaluation(evalFen, this.app.evalCache);
                  this.evaluationCache[evalKey] = rawEval;
                } catch (err) {
                  console.error('Error preloading eval:', err);
                  this.evaluationCache[evalKey] = null;
                }

                tempGame.undo();
              }
            }
          }
        } catch (error) {
          console.error('Error preloading data for position:', error);
          this.topMovesData[positionFen] = [];
        }
      }

      updateProgress();

      if (i < this.moveHistory.length) {
        const move = this.moveHistory[i];
        tempGame.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion
        });
      }
    }
  }

  async initializeAnalysis() {
    console.log('🔍 Initializing analysis board...');

    if (!this.app.game) {
      console.error('❌ No game available for analysis');
      throw new Error('No game available for analysis');
    }

    this.analysisStartFen = (this.app.mode === 'practice' && this.app.practiceOpening && this.app.practiceOpening.fen)
      ? this.app.practiceOpening.fen
      : null;

    const currentGameFen = this.app.game.fen();
    const historyVerbose = this.app.game.history({ verbose: true });
    const historySimple = this.app.game.history({ verbose: false });

    console.log('🔍 Analysis initialize debug:', {
      mode: this.app.mode,
      aiSource: this.app.aiSource,
      playerColor: this.app.playerColor,
      currentGameFen,
      practiceOpening: this.app.practiceOpening,
      analysisStartFen: this.analysisStartFen,
      historyVerbose,
      historySimple,
      historyLength: historyVerbose.length
    });

    this.analysisGame = this.analysisStartFen ? new Chess(this.analysisStartFen) : new Chess();

    const history = historyVerbose;
    this.moveHistory = history;
    this.currentMoveIndex = -1;
    this.isAnalyzing = true;

    console.log(`✅ Analysis initialized with ${history.length} moves`);
    console.log('🔄 Preloading evaluations and move data...');
    await this.preloadAllData();
    console.log('✅ All data preloaded');

    await this.updatePositionInfo();
  }

  goToMove(moveIndex) {
    if (this.analysisStartFen) {
      this.analysisGame = new Chess(this.analysisStartFen);
    } else {
      this.analysisGame.reset();
    }

    for (let i = 0; i < moveIndex && i < this.moveHistory.length; i++) {
      const move = this.moveHistory[i];
      try {
        this.analysisGame.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion
        });
      } catch (error) {
        console.error('Error replaying move:', error, move);
        break;
      }
    }

    this.currentMoveIndex = moveIndex - 1;
    return this.updatePositionInfo();
  }

  nextMove() {
    if (this.currentMoveIndex < this.moveHistory.length - 1) {
      const nextMove = this.moveHistory[this.currentMoveIndex + 1];
      try {
        this.analysisGame.move({
          from: nextMove.from,
          to: nextMove.to,
          promotion: nextMove.promotion
        });
        this.currentMoveIndex++;
        return this.updatePositionInfo();
      } catch (error) {
        console.error('Error making next move:', error, nextMove);
      }
    }
    return Promise.resolve();
  }

  previousMove() {
    if (this.currentMoveIndex >= 0) {
      try {
        this.analysisGame.undo();
        this.currentMoveIndex--;
        return this.updatePositionInfo();
      } catch (error) {
        console.error('Error undoing move:', error);
      }
    }
    return Promise.resolve();
  }

  async updatePositionInfo() {
    await this.updateEvaluation();
    await this.updateMoveComparison();
    if (this.app && this.app._notify) this.app._notify();
  }

  async updateEvaluation() {
    try {
      const fen = this.analysisGame.fen();
      const rawEval = await ChessAPI.getEvaluation(fen, this.app.evalCache);

      const playerEval = this.app.playerColor === 'b' ? -rawEval : rawEval;
      const displayEval = playerEval > 0 ? '+' + playerEval.toFixed(1) : playerEval.toFixed(1);

      this.currentEval = displayEval;
      this.currentEvalColor = playerEval > 1 ? '#2ecc71' : playerEval < -1 ? '#e74c3c' : '#f1c40f';
    } catch (error) {
      console.error('Error updating evaluation:', error);
      this.currentEval = 'N/A';
      this.currentEvalColor = '#888';
    }
  }

  async updateMoveComparison() {
    // Reset
    this.arrows = [];

    if (this.currentMoveIndex < 0) {
      this.tableData = [];
      this.positionText = 'Starting Position';
      this.evalText = `Eval: ${this.currentEval || '0.0'}`;
      return;
    }

    const currentMove = this.moveHistory[this.currentMoveIndex];
    const moveNumber = this.currentMoveIndex;
    const isWhiteMove = moveNumber % 2 === 0;
    const isPlayerMove = (this.app.playerColor === 'w' && isWhiteMove) ||
                         (this.app.playerColor === 'b' && !isWhiteMove);

    try {
      const tempGame = this.analysisStartFen ? new Chess(this.analysisStartFen) : new Chess();
      for (let i = 0; i < this.currentMoveIndex; i++) {
        const move = this.moveHistory[i];
        tempGame.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion
        });
      }

      const positionFen = tempGame.fen();
      const topMoves = this.topMovesData[positionFen] || [];

      if (topMoves.length === 0) {
        this.tableData = [];
        this.positionText = 'No database moves available for this position';
        return;
      }

      const currentMoveUci = currentMove.from + currentMove.to + (currentMove.promotion || '');
      const currentMoveIndexInTop = topMoves.findIndex(m => m.uci === currentMoveUci);

      const tableData = [];
      const colors = ['#2ecc71', '#f1c40f', '#e67e22'];
      const labels = ['Top', '2nd', '3rd'];
      const moveLabel = isPlayerMove ? 'Your' : 'AI';

      for (let idx = 0; idx < Math.min(3, topMoves.length); idx++) {
        const move = topMoves[idx];
        const totalGames = move.white + move.draws + move.black;
        const whiteWin = totalGames > 0 ? ((move.white / totalGames) * 100).toFixed(1) : 0;
        const draws = totalGames > 0 ? ((move.draws / totalGames) * 100).toFixed(1) : 0;
        const blackWin = totalGames > 0 ? ((move.black / totalGames) * 100).toFixed(1) : 0;

        const isCurrentMove = move.uci === currentMoveUci;

        let moveEval = '-';
        let moveEvalColor = '#888';

        const shouldShowEval = isPlayerMove || isCurrentMove;

        if (shouldShowEval) {
          const evalKey = `${positionFen}_${move.uci}`;
          const cachedEval = this.evaluationCache[evalKey];

          if (cachedEval !== undefined && cachedEval !== null) {
            const playerEval = this.app.playerColor === 'b' ? -cachedEval : cachedEval;
            moveEval = playerEval > 0 ? '+' + playerEval.toFixed(1) : playerEval.toFixed(1);
            moveEvalColor = playerEval > 1 ? '#2ecc71' : playerEval < -1 ? '#e74c3c' : '#f1c40f';
          } else if (cachedEval === null) {
            moveEval = 'N/A';
          }
        }

        tableData.push({
          move: move.san,
          color: colors[idx],
          label: labels[idx],
          whiteWin,
          draws,
          blackWin,
          totalGames,
          isCurrentMove,
          moveType: isCurrentMove ? moveLabel : '',
          eval: moveEval,
          evalColor: moveEvalColor
        });
      }

      if (currentMoveIndexInTop === -1 || currentMoveIndexInTop > 2) {
        const currentMoveData = topMoves.find(m => m.uci === currentMoveUci);
        if (currentMoveData) {
          const totalGames = currentMoveData.white + currentMoveData.draws + currentMoveData.black;
          const whiteWin = totalGames > 0 ? ((currentMoveData.white / totalGames) * 100).toFixed(1) : 0;
          const draws = totalGames > 0 ? ((currentMoveData.draws / totalGames) * 100).toFixed(1) : 0;
          const blackWin = totalGames > 0 ? ((currentMoveData.black / totalGames) * 100).toFixed(1) : 0;

          let moveEval = '-';
          let moveEvalColor = '#888';

          const evalKey = `${positionFen}_${currentMoveUci}`;
          const cachedEval = this.evaluationCache[evalKey];

          if (cachedEval !== undefined && cachedEval !== null) {
            const playerEval = this.app.playerColor === 'b' ? -cachedEval : cachedEval;
            moveEval = playerEval > 0 ? '+' + playerEval.toFixed(1) : playerEval.toFixed(1);
            moveEvalColor = playerEval > 1 ? '#2ecc71' : playerEval < -1 ? '#e74c3c' : '#f1c40f';
          } else if (cachedEval === null) {
            moveEval = 'N/A';
          }

          tableData.push({
            move: currentMove.san,
            color: '#3498db',
            label: moveLabel,
            whiteWin,
            draws,
            blackWin,
            totalGames,
            isCurrentMove: true,
            moveType: moveLabel,
            eval: moveEval,
            evalColor: moveEvalColor
          });
        }
      }

      let positionText = 'Starting Position';
      if (this.currentMoveIndex >= 0) {
        const moveNum = Math.floor(this.currentMoveIndex / 2) + 1;
        const side = this.currentMoveIndex % 2 === 0 ? 'W' : 'B';
        const move = this.moveHistory[this.currentMoveIndex];
        positionText = `Move ${moveNum} (${side}): ${move.san}`;
      }

      this.tableData = tableData;
      this.positionText = positionText;
      this.evalText = `Eval: ${this.currentEval || '0.0'}`;

      // Compute arrow descriptors (consumed by React board component)
      this.arrows = this.computeMoveArrows(currentMove, topMoves.slice(0, 3), currentMoveIndexInTop, isPlayerMove);
    } catch (error) {
      console.error('Error updating move comparison:', error);
    }
  }

  // Pure function: returns array of arrow descriptors instead of drawing to SVG directly.
  // Each descriptor: { from, to, color, width, outlineColor, dashed }
  //
  // Simplified per design: always show the top-3 book moves, and — only when
  // it's the player's own move — a single arrow for it (in its rank color if
  // it happens to be a top-3 move, otherwise a distinct blue "your move"
  // arrow). AI/opponent move arrows and the old merged double-stroke
  // "combined" rendering are no longer drawn, keeping the board crisp and
  // uncluttered.
  computeMoveArrows(currentMove, topMoves, currentMoveIndexInTop, isPlayerMove) {
    const arrows = [];
    const currentMoveUci = currentMove.from + currentMove.to + (currentMove.promotion || '');
    const isTop3Move = currentMoveIndexInTop >= 0 && currentMoveIndexInTop <= 2;
    const colors = ['#2ecc71', '#f1c40f', '#e67e22'];

    topMoves.forEach((move, idx) => {
      if (move.uci === currentMoveUci) return;
      const from = move.uci.substring(0, 2);
      const to = move.uci.substring(2, 4);
      arrows.push({ from, to, color: colors[idx], width: 6, outlineColor: null, dashed: false });
    });

    if (isPlayerMove) {
      const color = isTop3Move ? colors[currentMoveIndexInTop] : '#3498db';
      arrows.push({ from: currentMove.from, to: currentMove.to, color, width: 8, outlineColor: null, dashed: false });
    }

    return arrows;
  }

  exitAnalysis() {
    console.log('Exiting analysis mode');
    this.isAnalyzing = false;
    this.analysisGame = null;
    this.currentMoveIndex = -1;
    this.moveHistory = [];
    this.topMovesData = {};
    // showingAnalysis is React-routing state that didn't exist in the
    // original (which swapped #app.innerHTML directly instead of tracking
    // a flag) — reset it here so app.render()'s routing-relevant guards
    // and the App.jsx screen switch both see analysis mode as over.
    this.app.showingAnalysis = false;
    this.app.render();
  }
}

export default AnalysisBoard;
