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

// Standard chess UCI writes castling as king-to-destination (e1g1), while
// some Explorer-compatible sources use king-to-rook-square (e1h1). Normalize
// both forms before comparing or replaying a move.
const CASTLING_UCI_ALIASES = {
  e1h1: 'e1g1', e1a1: 'e1c1',
  e8h8: 'e8g8', e8a8: 'e8c8'
};

function canonicalUci(uci) {
  if (!uci) return uci;
  const move = uci.slice(0, 4);
  return (CASTLING_UCI_ALIASES[move] || move) + uci.slice(4);
}

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
          let movesForPosition = data.moves || [];

          if (i < this.moveHistory.length) {
            const isWhiteMove = i % 2 === 0;
            const isPlayerMove = (this.app.playerColor === 'w' && isWhiteMove) ||
                                 (this.app.playerColor === 'b' && !isWhiteMove);
            const actualMove = this.moveHistory[i];
            const actualMoveUci = actualMove.from + actualMove.to + (actualMove.promotion || '');

            // Most positions only need five moves. If the played move falls
            // outside that small response, expand just this position so the
            // analysis can display its database values without making every
            // analysis request heavier.
            if (movesForPosition.length > 0 && !movesForPosition.some(move => canonicalUci(move.uci) === actualMoveUci)) {
              const expandedData = await ChessAPI.queryExplorer(this.app.aiSource, positionFen, 20);
              movesForPosition = expandedData.moves || movesForPosition;
            }

            this.topMovesData[positionFen] = movesForPosition;
            const topMoves = movesForPosition.slice(0, 3);
            const movesToEvaluate = isPlayerMove ? [...topMoves, actualMove] : [actualMove];
            const evaluatedUcis = new Set();

            for (const move of movesToEvaluate) {
              const uci = canonicalUci(move.uci || actualMoveUci);
              if (evaluatedUcis.has(uci)) continue;
              evaluatedUcis.add(uci);

              const evalKey = `${positionFen}_${uci}`;
              if (Object.hasOwn(this.evaluationCache, evalKey)) continue;

              const evalGame = new Chess(positionFen);
              try {
                evalGame.move({
                  from: uci.substring(0, 2),
                  to: uci.substring(2, 4),
                  promotion: uci.length > 4 ? uci[4] : undefined
                });
                const rawEval = await ChessAPI.getEvaluation(evalGame.fen(), this.app.evalCache);
                this.evaluationCache[evalKey] = rawEval;
              } catch (err) {
                console.error('Error preloading eval:', err);
                this.evaluationCache[evalKey] = null;
              }
            }
          } else {
            this.topMovesData[positionFen] = movesForPosition;
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

    // Land on the first move right away instead of the blank "Starting
    // Position" placeholder — avoids an empty move-comparison bar the
    // player has to tap "Next" past before seeing anything useful.
    if (this.moveHistory.length > 0) {
      await this.goToMove(1);
    } else {
      await this.updatePositionInfo();
    }
  }

  // How many of the player's own moves had already been made to reach the
  // position currently on screen (currentMoveIndex). Uses the same
  // even-index-is-white / isPlayerMove logic as preloadAllData() above, so
  // it always agrees with what "Move N (side)" already shows in
  // positionText. This is what "Add to Practice" (AnalysisScreen.jsx →
  // ChessTheoryApp.addAnalysisPositionToPractice) captures as the opening
  // row's implicit `moveNumber` column — see practiceOpeningsStore.js —
  // so a later practice session resuming from this FEN can tell the
  // scoring assessment how much theory depth already existed before play
  // resumes here, instead of always assuming a from-scratch opening.
  getCapturedMoveNumber() {
    if (this.currentMoveIndex < 0) return 0;
    const playerColor = this.app.playerColor;
    let count = 0;
    for (let i = 0; i <= this.currentMoveIndex; i++) {
      const isWhiteMove = i % 2 === 0;
      const isPlayerMove = (playerColor === 'w' && isWhiteMove) || (playerColor === 'b' && !isWhiteMove);
      if (isPlayerMove) count++;
    }
    return count;
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
        const moveNum = Math.floor(this.currentMoveIndex / 2) + 1;
        const side = this.currentMoveIndex % 2 === 0 ? 'W' : 'B';
        this.tableData = [];
        this.positionText = `Move ${moveNum} (${side}): ${currentMove.san}`;
        return;
      }

      const currentMoveUci = currentMove.from + currentMove.to + (currentMove.promotion || '');
      const currentMoveIndexInTop = topMoves.findIndex(m => canonicalUci(m.uci) === currentMoveUci);

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

        const isCurrentMove = canonicalUci(move.uci) === currentMoveUci;

        let moveEval = '-';
        let moveEvalColor = '#888';

        const shouldShowEval = isPlayerMove || isCurrentMove;

        if (shouldShowEval) {
          const evalKey = `${positionFen}_${canonicalUci(move.uci)}`;
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
          hasStats: true,
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
        const currentMoveData = topMoves.find(m => canonicalUci(m.uci) === currentMoveUci);
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
            hasStats: true,
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
        } else {
          // The wider Explorer request did not contain this legal move. Keep
          // it visible and be explicit that its database statistics are
          // unavailable instead of silently omitting it from the analysis.
          const evalKey = `${positionFen}_${currentMoveUci}`;
          const cachedEval = this.evaluationCache[evalKey];
          let moveEval = 'N/A';
          let moveEvalColor = '#888';
          if (cachedEval !== undefined && cachedEval !== null) {
            const playerEval = this.app.playerColor === 'b' ? -cachedEval : cachedEval;
            moveEval = playerEval > 0 ? '+' + playerEval.toFixed(1) : playerEval.toFixed(1);
            moveEvalColor = playerEval > 1 ? '#2ecc71' : playerEval < -1 ? '#e74c3c' : '#f1c40f';
          }
          tableData.push({
            move: currentMove.san,
            hasStats: false,
            color: '#3498db',
            label: moveLabel,
            whiteWin: null,
            draws: null,
            blackWin: null,
            totalGames: null,
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
  // Simplified per design: arrows are only drawn when viewing one of the
  // human player's own moves — top-3 book moves plus a single arrow for
  // the move actually played (in its rank color if it happens to be a
  // top-3 move, otherwise a distinct blue "your move" arrow). AI/opponent
  // move turns show no arrows at all, keeping the board crisp and making
  // clear at a glance which moves are actually yours to review.
  computeMoveArrows(currentMove, topMoves, currentMoveIndexInTop, isPlayerMove) {
    if (!isPlayerMove) return [];

    const arrows = [];
    const currentMoveUci = currentMove.from + currentMove.to + (currentMove.promotion || '');
    const isTop3Move = currentMoveIndexInTop >= 0 && currentMoveIndexInTop <= 2;
    const colors = ['#2ecc71', '#f1c40f', '#e67e22'];

    topMoves.forEach((move, idx) => {
      const uci = canonicalUci(move.uci);
      if (uci === currentMoveUci) return;
      const from = uci.substring(0, 2);
      const to = uci.substring(2, 4);
      arrows.push({ from, to, color: colors[idx], width: 6, outlineColor: null, dashed: false });
    });

    const color = isTop3Move ? colors[currentMoveIndexInTop] : '#3498db';
    arrows.push({ from: currentMove.from, to: currentMove.to, color, width: 8, outlineColor: null, dashed: false });

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
