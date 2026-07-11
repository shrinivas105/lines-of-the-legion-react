// logic/chessTheoryApp.js - Core chess game logic and state management
// Converted from game-logic.js
//
// LOGIC PRESERVED VERBATIM: every scoring/move/state-transition algorithm,
// constructor field, and method body is unchanged from the legacy app.
// ONLY CHANGE: DOM manipulation calls (document.getElementById(...).innerHTML = ...,
// app.innerHTML, etc.) used purely for *painting* have been removed since React
// components now read this class's state and render it declaratively.
//
// `render()` no longer paints the DOM — it now just invokes `this._notify()`,
// a callback wired up by the `useChessTheoryApp` hook, which triggers a React
// re-render. All conditional logic inside render() (which screen to show, when
// to trigger aiMove, etc.) is preserved exactly.

import { Chess } from 'chess.js';
import { ChessAPI, pieces } from '../services/chessApi';
import { Scoring } from './scoring';
import { PGNExporter } from './pgnExporter';
import { RomanBattleEffects } from './romanBattleEffects';
import { AuthModule } from './authModule';
import { AnalysisBoard } from './analysisBoard';
import {
  SKIP_QUALITY_MOVES,
  PRACTICE_MODE,
  MASTER_TRICKY_MOVE,
  CLUB_TRICKY_MOVE,
} from '../config';

export class ChessTheoryApp {
  constructor() {
    // Game state
    this.game = new Chess();
    this.mode = null;                     // 'master', 'lichess', 'practice'
    this.playerColor = null;
    this.aiSource = null;
    this.practiceOpening = null;
    this.practiceStartingPosition = false;
    this.selected = null;
    this.dragSource = null;
    this.lastMove = { from: null, to: null };
    this.gameCount = 0;
    this.evalCache = {};
    this.lastAIMoveFEN = null;
    this.playerMoves = 0;
    this.topMoveChoices = 0;
    this.qualityTrackedMoves = 0;
    this.hintUsed = false;
    this.topGames = [];
    this.recentGames = [];
    this.pieceImages = pieces;
    this.rankChangeMessage = null;
    this.rankChangeType = null;
    this.currentPGN = null;
    this.accuracyBonus = 0;
    this.accuracyTier = null;
    this.gameEnded = false;
    this.endGameData = null;
    this.apiErrorState = false; // replaces direct DOM error screen painting
    this.theoryMessage = null;  // hint / commander message text (was painted to #theoryMessage)
    this.theoryMessageVisible = false;

    // Load progress from localStorage first
    this.legionMerits = JSON.parse(localStorage.getItem('chessTheoryLegionMerits') || '{}');
    this.gamesPlayedMaster = parseInt(localStorage.getItem('chessTheoryGamesPlayedMaster') || '0');
    this.gamesPlayedLichess = parseInt(localStorage.getItem('chessTheoryGamesPlayedLichess') || '0');
    this.recentBattleRanksMaster = JSON.parse(localStorage.getItem('chessTheoryRecentBattleRanksMaster') || '[]');
    this.recentBattleRanksLichess = JSON.parse(localStorage.getItem('chessTheoryRecentBattleRanksLichess') || '[]');
    this.lastColorMaster = localStorage.getItem('chessTheoryLastColorMaster') || null;
    this.lastColorLichess = localStorage.getItem('chessTheoryLastColorLichess') || null;

    // Initialize modules
    this.auth = new AuthModule(this);
    this.analysisBoard = new AnalysisBoard(this);

    // React notify callback — wired by useChessTheoryApp hook
    this._notify = null;

    // Analysis view flag (was: swapping #app innerHTML to analysis board markup)
    this.showingAnalysis = false;
    this.analysisLoading = false;
  }

  async init() {
    await this.auth.initialize();
    await this.checkForAbandonedBattle();
    this.render();
  }

  saveActiveGameState() {
    if (this.mode === 'practice' || !this.aiSource || !this.playerColor) return;

    try {
      localStorage.setItem('chessTheoryActiveGame', JSON.stringify({
        fen: this.game.fen(),
        mode: this.mode,
        aiSource: this.aiSource,
        playerColor: this.playerColor,
        playerMoves: this.playerMoves,
        topMoveChoices: this.topMoveChoices,
        qualityTrackedMoves: this.qualityTrackedMoves,
        hintUsed: this.hintUsed,
        gameCount: this.gameCount,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error('Failed to save active game state:', e);
    }
  }

  clearActiveGameState() {
    localStorage.removeItem('chessTheoryActiveGame');
  }

  async checkForAbandonedBattle() {
    const saved = localStorage.getItem('chessTheoryActiveGame');
    if (!saved) return;

    localStorage.removeItem('chessTheoryActiveGame');

    let state;
    try {
      state = JSON.parse(saved);
    } catch (e) {
      return;
    }

    if (!state || state.mode === 'practice' || !state.fen || !state.aiSource || !state.playerColor) {
      return;
    }

    try {
      this.game.load(state.fen);
    } catch (e) {
      console.error('Could not restore abandoned battle position:', e);
      return;
    }

    this.mode = state.mode;
    this.aiSource = state.aiSource;
    this.playerColor = state.playerColor;
    this.playerMoves = state.playerMoves || 0;
    this.topMoveChoices = state.topMoveChoices || 0;
    this.qualityTrackedMoves = state.qualityTrackedMoves || 0;
    this.hintUsed = state.hintUsed || false;
    this.gameCount = state.gameCount || 0;
    this.topGames = [];
    this.recentGames = [];

    console.log('⚠️ Resolving abandoned battle as a forfeit at the position it was left in.');
    await this.stopGameDueToThinTheory();
  }

  goHome() {
    this.mode = null;
    this.playerColor = null;
    this.aiSource = null;
    this.practiceOpening = null;
    this.practiceStartingPosition = false;
    this.gameEnded = false;
    this.endGameData = null;
    this.showingAnalysis = false;
    this.resetGameState();
    this.render();
  }

  // Storage methods
  saveToLocalStorage() {
    localStorage.setItem('chessTheoryLegionMerits', JSON.stringify(this.legionMerits));
    localStorage.setItem('chessTheoryGamesPlayedMaster', this.gamesPlayedMaster.toString());
    localStorage.setItem('chessTheoryGamesPlayedLichess', this.gamesPlayedLichess.toString());
    localStorage.setItem('chessTheoryRecentBattleRanksMaster', JSON.stringify(this.recentBattleRanksMaster));
    localStorage.setItem('chessTheoryRecentBattleRanksLichess', JSON.stringify(this.recentBattleRanksLichess));
    localStorage.setItem('chessTheoryLastColorMaster', this.lastColorMaster || '');
    localStorage.setItem('chessTheoryLastColorLichess', this.lastColorLichess || '');
  }

  async saveAllProgress() {
    this.saveToLocalStorage();
    await this.auth.saveCloudProgress();
  }

  getRecentBattleRanks(source) {
    return source === 'master' ? this.recentBattleRanksMaster : this.recentBattleRanksLichess;
  }

  setRecentBattleRanks(source, ranks) {
    if (source === 'master') {
      this.recentBattleRanksMaster = ranks;
    } else {
      this.recentBattleRanksLichess = ranks;
    }
  }

  async updateLegionMerit(score, battleRankTitle, recentRanks) {
    const meritKey = `${this.aiSource}_merit`;
    const oldMerit = this.legionMerits[meritKey] || 0;
    const oldLegion = Scoring.getLegionRank(oldMerit);
    let newMerit = oldMerit + score;
    const tempLegion = Scoring.getLegionRank(newMerit);
    let rankChanged = false;

    const demotionCheck = Scoring.checkDemotion(oldLegion.title, recentRanks, battleRankTitle, oldMerit);
    if (demotionCheck && demotionCheck.demote) {
      newMerit = demotionCheck.newMerit;
      if (demotionCheck.isReset) {
        this.rankChangeMessage = `Reset !! <br>Honor remains. Merit must be earned again. Merit reset to ${newMerit}.`;
        this.rankChangeType = 'reset';
      } else {
        this.rankChangeMessage = `Demotion !! <br>Your honor has diminished. You are now ${Scoring.getLegionRank(newMerit).title}.`;
        this.rankChangeType = 'demotion';
      }
      rankChanged = true;
      this.setRecentBattleRanks(this.aiSource, []);
    } else if (Scoring.canPromote(oldLegion.title, newMerit, recentRanks) && tempLegion.level > oldLegion.level) {
      newMerit = tempLegion.thresholds[tempLegion.level];
      this.rankChangeMessage = `⚔️ Commander: You have been promoted to ${tempLegion.title}! A cup of Falernian wine for the glory you've won. 🏺`;
      this.rankChangeType = 'promotion';
      rankChanged = true;
      this.setRecentBattleRanks(this.aiSource, []);
    } else {
      this.rankChangeType = null;
    }

    this.legionMerits[meritKey] = newMerit;

    if (this.aiSource === 'master') {
      this.gamesPlayedMaster++;
      this.lastColorMaster = this.playerColor;
    } else {
      this.gamesPlayedLichess++;
      this.lastColorLichess = this.playerColor;
    }

    await this.saveAllProgress();
    return rankChanged;
  }

  // Game flow methods
  selectSource(source) {
    this.mode = source;
    this.aiSource = source;
    this.render();
  }

  startPracticePicker() {
    this.mode = 'practice';
    this.aiSource = PRACTICE_MODE.source;
    this.practiceOpening = null;
    this.playerColor = null;
    this.practiceStartingPosition = false;
    this.gameEnded = false;
    this.endGameData = null;
    if (typeof RomanBattleEffects !== 'undefined') {
      RomanBattleEffects.stopMusic();
    }
    this.resetGameState();
    this.render();
  }

  startPracticeOpening(opening) {
    this.mode = 'practice';
    this.aiSource = PRACTICE_MODE.source;
    this.practiceOpening = opening;
    this.playerColor = opening.orientation === 'white' ? 'w' : 'b';
    this.practiceStartingPosition = true;
    this.gameEnded = false;
    this.endGameData = null;
    this.resetGameState();
    this.game.load(opening.fen);
    this.selected = null;
    this.lastMove = { from: null, to: null };
    this.gameCount = 0;
    this.lastAIMoveFEN = null;
    this.playerMoves = 0;
    this.topMoveChoices = 0;
    this.qualityTrackedMoves = 0;
    this.hintUsed = false;
    this.topGames = [];
    this.recentGames = [];
    this.currentPGN = null;
    this.render();
  }

  startBattle() {
    // Determine next color based on last played color
    const lastColor = this.aiSource === 'master' ? this.lastColorMaster : this.lastColorLichess;
    const nextColor = !lastColor ? 'w' : (lastColor === 'w' ? 'b' : 'w');

    if (typeof RomanBattleEffects !== 'undefined') {
      RomanBattleEffects.stopMusic();
    }

    console.log(`🎯 Starting battle - Last color: ${lastColor || 'none'}, Next color: ${nextColor}`);

    this.playerColor = nextColor;
    this.hintUsed = false;
    this.resetGameState();
    this.render();
  }

  selectColor(color) {
    this.playerColor = color;
    this.hintUsed = false;
    this.resetGameState();
    this.render();
  }

  resetGameState() {
    this.game.reset();
    this.selected = null;
    this.dragSource = null;
    this.lastMove = { from: null, to: null };
    this.gameCount = 0;
    this.playerMoves = 0;
    this.topMoveChoices = 0;
    this.qualityTrackedMoves = 0;
    this.hintUsed = false;
    this.lastAIMoveFEN = null;
    this.topGames = [];
    this.recentGames = [];
    this.currentPGN = null;
    this.gameEnded = false;
    this.endGameData = null;
    this.apiErrorState = false;
    this.theoryMessage = null;
    this.theoryMessageVisible = false;
  }

  async resetStats() {
    // Confirmation now handled by the React UI layer before calling this method
    this.legionMerits = {};
    this.gamesPlayedMaster = 0;
    this.gamesPlayedLichess = 0;
    this.recentBattleRanksMaster = [];
    this.recentBattleRanksLichess = [];
    this.lastColorMaster = null;
    this.lastColorLichess = null;

    localStorage.removeItem('chessTheoryLegionMerits');
    localStorage.removeItem('chessTheoryGamesPlayedMaster');
    localStorage.removeItem('chessTheoryGamesPlayedLichess');
    localStorage.removeItem('chessTheoryRecentBattleRanksMaster');
    localStorage.removeItem('chessTheoryRecentBattleRanksLichess');
    localStorage.removeItem('chessTheoryLastColorMaster');
    localStorage.removeItem('chessTheoryLastColorLichess');

    if (this.auth.isLoggedIn) {
      await this.auth.saveCloudProgress();
    }

    this.render();
  }

  // Chess API methods
  async queryExplorer() {
    const fen = this.game.fen();
    try {
      const data = await ChessAPI.queryExplorer(this.aiSource, fen);

      if (data.apiError) {
        console.error('❌ Lichess Explorer API is unreachable.');
        this.endGameApiError();
        return;
      }

      const totalGames = (data.white || 0) + (data.draws || 0) + (data.black || 0);
      this.gameCount = totalGames;
      // NOTE: the original updates a single DOM element (#gameCount) directly
      // here, WITHOUT calling render(). Calling render() here would re-enter
      // render()'s own "if not ended/showingAnalysis, call queryExplorer()"
      // branch, and since ChessAPI.queryExplorer caches by position, repeat
      // calls for a stable position resolve almost immediately — creating a
      // tight render()->queryExplorer()->render() microtask loop that starves
      // the browser's input/paint pipeline (all buttons appear dead). So we
      // only signal React to repaint the gameCount text, not re-run render()'s
      // side effects.
      if (this._notify) this._notify();
    } catch (e) {
      console.error('Explorer query failed:', e);
    }
  }

  async handleClick(row, col) {
    if (this.game.turn() !== this.playerColor || this.game.isGameOver()) return;
    const square = 'abcdefgh'[col] + (8 - row);

    if (this.selected) {
      const moveOptions = { from: this.selected, to: square, promotion: 'q' };
      const preMoveFEN = this.game.fen();
      let move = null;
      try {
        move = this.game.move(moveOptions);
      } catch (e) {
        move = null;
      }
      if (move) {
        this.lastMove = { from: move.from, to: move.to };
        this.playerMoves++;

        if (this.mode !== 'practice' && typeof RomanBattleEffects !== 'undefined') {
          if (move.captured) {
            RomanBattleEffects.playCaptureSound();
          } else if (move.promotion) {
            RomanBattleEffects.playPromotionSound();
          } else {
            RomanBattleEffects.playMoveSound();
          }
        }

        const moveUCI = move.from + move.to + (move.promotion || '');
        await this.checkMoveQuality(preMoveFEN, moveUCI);
        this.saveActiveGameState();
        this.selected = null;
        this.theoryMessageVisible = false;
        this.render();
        return;
      }
      this.selected = null;
    }

    const piece = this.game.get(square);
    if (piece && piece.color === this.playerColor) {
      this.selected = square;
    }
    // Matches the original's this.ui.renderBoard() here (a direct repaint,
    // not the full render() dispatcher) — selecting/deselecting a piece
    // shouldn't re-trigger queryExplorer() or re-evaluate AI-move scheduling.
    if (this._notify) this._notify();
  }

  async handleDragMove(from, to) {
    if (this.game.turn() !== this.playerColor || this.game.isGameOver()) return;
    const moveOptions = { from, to, promotion: 'q' };
    const preMoveFEN = this.game.fen();
    let move = null;
    try {
      move = this.game.move(moveOptions);
    } catch (e) {
      move = null;
    }
    if (!move) {
      this.dragSource = null;
      // Matches original's this.ui.renderBoard() here — an illegal drop
      // just needs a repaint (snap the piece back), not a full render()
      // pass with its queryExplorer()/aiMove-scheduling side effects.
      if (this._notify) this._notify();
      return;
    }

    this.lastMove = { from: move.from, to: move.to };
    this.playerMoves++;
    this.dragSource = null;

    if (this.mode !== 'practice' && typeof RomanBattleEffects !== 'undefined') {
      if (move.captured) {
        RomanBattleEffects.playCaptureSound();
      } else if (move.promotion) {
        RomanBattleEffects.playPromotionSound();
      } else {
        RomanBattleEffects.playMoveSound();
      }
    }

    const moveUCI = move.from + move.to + (move.promotion || '');
    await this.checkMoveQuality(preMoveFEN, moveUCI);
    this.saveActiveGameState();
    this.selected = null;
    this.theoryMessageVisible = false;
    this.render();
  }

  async checkMoveQuality(prevFEN, playerUCI) {
    try {
      this.qualityTrackedMoves++;

      if (this.playerMoves <= SKIP_QUALITY_MOVES) {
        this.topMoveChoices++;
        console.log(`⭐️ Opening book move ${this.playerMoves} - auto-counted as top 3 (${this.topMoveChoices}/${this.qualityTrackedMoves})`);
        return;
      }

      const data = await ChessAPI.queryExplorer(this.aiSource, prevFEN);

      if (!data.moves || data.moves.length === 0) {
        console.log(`⚠️ No explorer data available for quality check (${this.topMoveChoices}/${this.qualityTrackedMoves})`);
        return;
      }

      const moveIndex = data.moves.findIndex(m =>
        m.uci === playerUCI || m.san === (
          playerUCI === 'e1g1' || playerUCI === 'e8g8' ? 'O-O' :
          playerUCI === 'e1c1' || playerUCI === 'e8c8' ? 'O-O-O' : ''
        )
      );

      if (moveIndex === -1) {
        console.log(`❌ Move not found in explorer data (${this.topMoveChoices}/${this.qualityTrackedMoves})`);
        return;
      }

      const isTop3 = moveIndex < 3;

      if (isTop3) {
        const playerMove = data.moves[moveIndex];
        const playerTotalGames = playerMove.white + playerMove.draws + playerMove.black;

        let playerWinPct, opponentWinPct;
        if (this.playerColor === 'w') {
          playerWinPct = (playerMove.white / playerTotalGames) * 100;
          opponentWinPct = (playerMove.black / playerTotalGames) * 100;
        } else {
          playerWinPct = (playerMove.black / playerTotalGames) * 100;
          opponentWinPct = (playerMove.white / playerTotalGames) * 100;
        }

        const playerWinRatio = opponentWinPct > 0 ? playerWinPct / opponentWinPct : 999;

        const otherTopMoves = data.moves.slice(0, 3).filter((_, idx) => idx !== moveIndex);

        if (otherTopMoves.length >= 2) {
          const otherWinPercentages = otherTopMoves.map(move => {
            const total = move.white + move.draws + move.black;
            if (this.playerColor === 'w') {
              return (move.white / total) * 100;
            } else {
              return (move.black / total) * 100;
            }
          });

          const otherWinRatios = otherTopMoves.map(move => {
            const total = move.white + move.draws + move.black;
            let winPct, losePct;
            if (this.playerColor === 'w') {
              winPct = (move.white / total) * 100;
              losePct = (move.black / total) * 100;
            } else {
              winPct = (move.black / total) * 100;
              losePct = (move.white / total) * 100;
            }
            return losePct > 0 ? winPct / losePct : 999;
          });

          const lowestOtherWinPct = Math.min(...otherWinPercentages);
          const winPctGap = lowestOtherWinPct - playerWinPct;
          const condition1 = winPctGap > 20;

          const condition2 = playerWinRatio < 1.0 && otherWinRatios.every(ratio => ratio > 1.0);

          if (condition1 && condition2) {
            console.log(`⚠️ Bad top move detected! Rank: ${moveIndex + 1}, Player win: ${playerWinPct.toFixed(1)}%, Opponent win: ${opponentWinPct.toFixed(1)}%, Ratio: ${playerWinRatio.toFixed(2)}, Gap: ${winPctGap.toFixed(1)}%, Other ratios: [${otherWinRatios.map(r => r.toFixed(2)).join(', ')}] - NOT counting as quality move (${this.topMoveChoices}/${this.qualityTrackedMoves})`);
            return;
          }
        }

        this.topMoveChoices++;
        console.log(`✅ Top 3 move! Rank: ${moveIndex + 1} (${this.topMoveChoices}/${this.qualityTrackedMoves})`);
        return;
      }

      // NEW TIERED TRICKY MOVE SYSTEM (Ranks 5-20)
      const trickyConfig = this.aiSource === 'master' ? MASTER_TRICKY_MOVE : CLUB_TRICKY_MOVE;

      if (trickyConfig && trickyConfig.enabled && moveIndex >= (trickyConfig.minRank - 1) && moveIndex <= (trickyConfig.maxRank - 1)) {
        const move = data.moves[moveIndex];
        const totalGames = move.white + move.draws + move.black;

        let playerWinPct, opponentWinPct;
        if (this.playerColor === 'w') {
          playerWinPct = (move.white / totalGames) * 100;
          opponentWinPct = (move.black / totalGames) * 100;
        } else {
          playerWinPct = (move.black / totalGames) * 100;
          opponentWinPct = (move.white / totalGames) * 100;
        }

        const winAdvantage = playerWinPct - opponentWinPct;

        let applicableTier = null;
        for (const tier of trickyConfig.tiers) {
          if (totalGames >= tier.minGames && totalGames <= tier.maxGames) {
            applicableTier = tier;
            break;
          }
        }

        if (applicableTier) {
          const meetsWinAdvantage = winAdvantage >= applicableTier.minWinAdvantage;

          if (meetsWinAdvantage) {
            this.topMoveChoices++;
            console.log(`🎯 Tricky move qualified! Rank: ${moveIndex + 1}, Win advantage: +${winAdvantage.toFixed(1)}%, Games: ${totalGames}, Tier: ${applicableTier.minGames}-${applicableTier.maxGames === Infinity ? '+' : applicableTier.maxGames} games (requires +${applicableTier.minWinAdvantage}%) (${this.topMoveChoices}/${this.qualityTrackedMoves})`);
            return;
          } else {
            console.log(`📊 Tricky move check: Rank ${moveIndex + 1}, Win advantage: +${winAdvantage.toFixed(1)}% (needs +${applicableTier.minWinAdvantage}%), Games: ${totalGames}`);
          }
        }
      }

      console.log(`❌ Not top 3, rank: ${moveIndex + 1} (${this.topMoveChoices}/${this.qualityTrackedMoves})`);
    } catch (e) {
      console.error('Quality check error:', e);
    }
  }

  async getHints() {
    if (this.hintUsed && this.mode !== 'practice') return;
    const fen = this.game.fen();
    try {
      const data = await ChessAPI.queryExplorer(this.aiSource, fen);
      const topMoves = data.moves ? data.moves.slice(0, 5) : [];

      if (topMoves.length === 0) {
        this.theoryMessage = '<em>No moves available in database.</em>';
        this.theoryMessageVisible = true;
        if (this.mode !== 'practice') {
          this.hintUsed = true;
        }
        // Matches original (mutates #theoryMessage/#hintBtn directly,
        // no render()/renderBoard() call) — just notify React to repaint.
        if (this._notify) this._notify();
        return;
      }

      const totalGames = (data.white || 0) + (data.draws || 0) + (data.black || 0);
      const apologyText = `🎖️ <strong>Commander speaks:</strong><br><br>"I'm sorry, soldier. I have not seen this position on the battlefield."`;
      const defeatLines = [
        `"Soldier... every path from here leads to ruin. This ground is already lost."`,
        `"There is no glory to be found here. The enemy holds every road we could take."`,
        `"I will not lie to you, soldier — this battle is already lost. Fight on, but expect no miracles."`
      ];
      let commanderText = '';

      const threshold = 50;

      const movesWithStats = topMoves.slice(0, 5).map(move => {
        const moveTotal = move.white + move.draws + move.black;
        const winPct = moveTotal > 0
          ? (this.playerColor === 'w' ? (move.white / moveTotal) * 100 : (move.black / moveTotal) * 100)
          : 0;
        return { san: move.san, games: moveTotal, winPct };
      });

      if (totalGames < threshold || movesWithStats.length < 3) {
        this.theoryMessage = apologyText;
        this.theoryMessageVisible = true;
        if (this.mode !== 'practice') {
          this.hintUsed = true;
        }
        return;
      }

      const anyAbove40 = movesWithStats.some(m => m.winPct > 40);
      if (!anyAbove40) {
        const line = defeatLines[Math.floor(Math.random() * defeatLines.length)];
        this.theoryMessage = `🎖️ <strong>Commander speaks:</strong><br><br>${line}`;
        this.theoryMessageVisible = true;
        if (this.mode !== 'practice') {
          this.hintUsed = true;
        }
        return;
      }

      const top3 = movesWithStats.slice(0, 3);
      const mostPopular = top3.reduce((max, move) => move.games > max.games ? move : max);
      const highestWin = top3.reduce((max, move) => move.winPct > max.winPct ? move : max);

      commanderText = `🎖️ <strong>Commander speaks:</strong><br><br>"Soldier, I have seen this position many times.`;

      if (mostPopular.san === highestWin.san) {
        commanderText += ` <strong>${mostPopular.san}</strong> is the most popular and strongest path — tried ${mostPopular.games.toLocaleString()} times with ${mostPopular.winPct.toFixed(1)}% victories!`;

        const remaining = top3.filter(m => m.san !== mostPopular.san);
        if (remaining.length > 0) {
          const secondBest = remaining[0];
          commanderText += ` Also consider <strong>${secondBest.san}</strong> — ${secondBest.games.toLocaleString()} games, ${secondBest.winPct.toFixed(1)}% win rate.`;
        }
      } else {
        commanderText += ` The most popular path is <strong>${mostPopular.san}</strong> — tried ${mostPopular.games.toLocaleString()} times, ${mostPopular.winPct.toFixed(1)}% victories.`;
        commanderText += ` Going for blood? March with <strong>${highestWin.san}</strong> — ${highestWin.winPct.toFixed(1)}% victories.`;
      }

      const shownMoves = new Set([mostPopular.san, highestWin.san]);
      const otherAlternatives = movesWithStats
        .filter(m => !shownMoves.has(m.san) && m.winPct > 40)
        .slice(0, 3);

      if (otherAlternatives.length > 0) {
        const altText = otherAlternatives
          .map(m => `${m.san}, ${m.winPct.toFixed(1)}% victories`)
          .join('; ');
        commanderText += ` Other alternatives: <strong>${altText}</strong>.`;
      }

      commanderText += ` The choice is yours. Good luck."`;
      this.theoryMessage = commanderText;
      this.theoryMessageVisible = true;
      if (this.mode !== 'practice') {
        this.hintUsed = true;
      }
      // Matches original (mutates #theoryMessage/#hintBtn directly) —
      // just notify React, don't re-run render()'s side effects.
      if (this._notify) this._notify();
    } catch (error) {
      this.theoryMessage = '<em>Unable to fetch hints.</em>';
      this.theoryMessageVisible = true;
      if (this._notify) this._notify();
    }
  }

  async aiMove() {
    const fen = this.game.fen();
    if (this.lastAIMoveFEN === fen) return;
    this.lastAIMoveFEN = fen;

    try {
      const data = await ChessAPI.queryExplorer(this.aiSource, fen);

      if (data.apiError) {
        console.error('❌ Lichess Explorer API is unreachable.');
        this.endGameApiError();
        return;
      }

      const totalGames = (data.white || 0) + (data.draws || 0) + (data.black || 0);
      this.gameCount = totalGames;
      const minGames = this.mode === 'practice' ? PRACTICE_MODE.minGames : (this.aiSource === 'master' ? 5 : 20);
      const hasMoves = data.moves && data.moves.length > 0;
      const ignoreThinAtStart = this.mode === 'practice' && this.practiceStartingPosition && this.game.history().length === 0;

      if ((!ignoreThinAtStart && (totalGames < minGames || !hasMoves)) || (!hasMoves && ignoreThinAtStart)) {
        const gamesData = await ChessAPI.queryGames(this.aiSource, fen);
        this.topGames = gamesData.topGames || [];
        this.recentGames = gamesData.recentGames || [];
        await this.stopGameDueToThinTheory();
        return;
      }

      if (this.practiceStartingPosition && this.game.history().length === 0) {
        this.practiceStartingPosition = false;
      }

      const top5Total = data.moves.reduce((sum, m) =>
        sum + m.white + m.draws + m.black, 0);

      const MIN_PERCENTAGE = 0.10;
      const minMoveGames = top5Total * MIN_PERCENTAGE;

      const filteredMoves = data.moves.filter(m => {
        const moveGames = m.white + m.draws + m.black;
        return moveGames >= minMoveGames;
      });

      const movesToUse = filteredMoves.length > 0 ? filteredMoves : [data.moves[0]];

      const filteredTotal = movesToUse.reduce((sum, m) =>
        sum + m.white + m.draws + m.black, 0);

      let rand = Math.random() * filteredTotal;
      let cumulative = 0;
      let selectedMove = movesToUse[0];

      for (const m of movesToUse) {
        cumulative += m.white + m.draws + m.black;
        if (rand <= cumulative) {
          selectedMove = m;
          break;
        }
      }

      let move = null;
      try {
        if (selectedMove.san === 'O-O' || selectedMove.san === 'O-O-O') {
          move = this.game.move(selectedMove.san);
        } else {
          const uci = selectedMove.uci;
          move = this.game.move({
            from: uci.slice(0, 2),
            to: uci.slice(2, 4),
            promotion: uci.length === 5 ? uci[4] : undefined
          });
        }
      } catch (e) {
        move = null;
      }

      if (move) {
        this.lastMove = { from: move.from, to: move.to };

        if (this.mode !== 'practice' && typeof RomanBattleEffects !== 'undefined') {
          if (move.captured) {
            RomanBattleEffects.playCaptureSound();
          } else if (move.promotion) {
            RomanBattleEffects.playPromotionSound();
          } else {
            RomanBattleEffects.playMoveSound();
          }
        }

        this.saveActiveGameState();

        if (this.game.isGameOver()) {
          await this.stopGameDueToThinTheory();
          return;
        }

        // Matches original's `this.ui.renderBoard(); this.queryExplorer();`
        // here — a direct repaint followed by one explorer query, not the
        // full render() dispatcher (which would also re-evaluate AI-move
        // scheduling unnecessarily right after the AI just moved).
        if (this._notify) this._notify();
        this.queryExplorer();
      }
    } catch (error) {
      console.error('aiMove error:', error);
    }
  }

  endGameApiError() {
    // End the game cleanly — API was unreachable, no scoring or rank/merit changes applied.
    this.clearActiveGameState();
    // NOTE: the original does NOT call render() here — it directly paints an
    // error screen and returns, bypassing render()'s routing/side-effect logic
    // entirely. This matters: render()'s queryExplorer()-trigger guard checks
    // `!(this.gameEnded && this.endGameData)`, and endGameData stays null in
    // this path, so calling render() here would still pass that guard and
    // re-trigger the very explorer call that just failed — creating another
    // render()->queryExplorer()->render() loop. We just notify React directly.
    this.gameEnded = true;
    this.endGameData = null;
    this.apiErrorState = true;
    if (this._notify) this._notify();
  }

  async stopGameDueToThinTheory() {
    this.clearActiveGameState();
    const fen = this.game.fen();
    const rawEval = await ChessAPI.getEvaluation(fen, this.evalCache);
    this.finalPlayerEval = Scoring.getPlayerEval(rawEval, this.playerColor);

    const scoreResult = Scoring.getTotalScore(
      this.playerMoves,
      this.topMoveChoices,
      this.finalPlayerEval,
      this.aiSource,
      this.qualityTrackedMoves
    );

    const score = scoreResult.score;
    const penaltyReason = scoreResult.penaltyReason;

    const battleRank = Scoring.getBattleRank(score, this.finalPlayerEval, penaltyReason, this.aiSource);

    if (this.mode === 'practice') {
      const moveQuality = Scoring.getMoveQuality(this.topMoveChoices, this.qualityTrackedMoves);
      const displayEval = this.finalPlayerEval > 0
        ? '+' + this.finalPlayerEval.toFixed(1)
        : this.finalPlayerEval.toFixed(1);

      this.currentPGN = PGNExporter.generatePGN(
        this.game,
        this.playerColor,
        this.aiSource,
        battleRank,
        score,
        moveQuality,
        this.finalPlayerEval
      );

      this.gameEnded = true;
      this.endGameData = {
        battleRank,
        moveQuality,
        displayEval,
        gamesToShow: this.recentGames,
        isPractice: true
      };

      // Matches original's direct this.ui.renderEndGameSummary(...) call —
      // just notify React, no need to re-run render()'s dispatcher logic.
      if (this._notify) this._notify();
      return;
    }

    // ─── CRITICAL FIX: Check promotion/demotion BEFORE updating battle history ───
    const recentRanksBeforeUpdate = this.getRecentBattleRanks(this.aiSource);
    const rankChanged = await this.updateLegionMerit(score, battleRank.title, recentRanksBeforeUpdate);

    if (!rankChanged) {
      const recentRanks = this.getRecentBattleRanks(this.aiSource);
      recentRanks.push(battleRank.title);
      if (recentRanks.length > 5) recentRanks.shift();
      this.setRecentBattleRanks(this.aiSource, recentRanks);

      await this.saveAllProgress();
    }

    const moveQuality = Scoring.getMoveQuality(this.topMoveChoices, this.qualityTrackedMoves);
    this.currentPGN = PGNExporter.generatePGN(
      this.game,
      this.playerColor,
      this.aiSource,
      battleRank,
      score,
      moveQuality,
      this.finalPlayerEval
    );

    const displayEval = this.finalPlayerEval > 0
      ? '+' + this.finalPlayerEval.toFixed(1)
      : this.finalPlayerEval.toFixed(1);
    const gamesToShow = this.aiSource === 'master' ? this.topGames : this.recentGames;

    this.gameEnded = true;
    this.endGameData = {
      battleRank,
      moveQuality,
      displayEval,
      gamesToShow,
      isPractice: false
    };

    // Matches original's direct this.ui.renderEndGameSummary(...) call.
    if (this._notify) this._notify();
  }

  downloadPGN() {
    if (this.currentPGN) {
      PGNExporter.downloadPGN(this.currentPGN);
    }
  }

  copyPGN() {
    if (this.currentPGN) {
      PGNExporter.copyPGNToClipboard(this.currentPGN);
    }
  }

  async showAnalysis() {
    console.log('📊 Show Analysis called');

    if (!this.analysisBoard) {
      console.error('❌ Analysis board not initialized');
      throw new Error('Analysis board not available. Please refresh the page.');
    }

    this.analysisLoading = true;
    this.showingAnalysis = true;
    // Matches original (paints a loading screen directly into #app, no
    // render() call) — just notify React.
    if (this._notify) this._notify();

    try {
      await this.analysisBoard.initializeAnalysis();
    } finally {
      this.analysisLoading = false;
      if (this._notify) this._notify();
    }
  }

  // Note: there is no app.exitAnalysis() wrapper — matching the original,
  // where the Exit button calls window.analysisBoard.exitAnalysis()
  // directly. See AnalysisBoard.exitAnalysis(), which resets
  // app.showingAnalysis itself and calls app.render().

  render() {
    // Determines which "screen" is active. All branching logic preserved verbatim;
    // React components read these fields to decide what to paint.
    if (this.game.turn() !== this.playerColor && this.playerColor && this.aiSource &&
        !(this.mode === 'practice' && !this.practiceOpening) &&
        !(this.gameEnded && this.endGameData) && !this.showingAnalysis) {
      const currentFEN = this.game.fen();
      if (this.lastAIMoveFEN !== currentFEN) {
        setTimeout(() => this.aiMove(), 800);
      }
    }

    if (!this.showingAnalysis && this.playerColor && this.aiSource &&
        !(this.mode === 'practice' && !this.practiceOpening) &&
        !(this.gameEnded && this.endGameData)) {
      this.queryExplorer();
    }

    if (this._notify) this._notify();
  }
}

export default ChessTheoryApp;
