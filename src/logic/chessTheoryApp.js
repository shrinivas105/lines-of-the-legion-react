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
import { addOpening } from '../services/practiceOpeningsStore';
import {
  SKIP_QUALITY_MOVES,
  PRACTICE_MODE,
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
    // Holds the promise for the most recent checkMoveQuality() call. The move
    // repaint no longer waits on this, but final scoring must — see
    // stopGameDueToThinTheory().
    this.pendingQualityCheck = null;
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
    this.apiErrorSource = null; // 'explorer' | 'eval' — which service failed, for the error message
    this.evalHealthChecked = false;    // true once the eval API has proven reachable this game
    this.evalHealthCheckInFlight = false;
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
      this.rankChangeMessage = `<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-right:2px" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 10.4 2.6 19h18.8l-1.4-8.6-4.3 3.6L12 9l-3.7 5-4.3-3.6z"/><rect x="3.4" y="19" width="17.2" height="2" rx="0.5"/><circle cx="4" cy="8.6" r="1.35"/><circle cx="12" cy="6.6" r="1.6"/><circle cx="20" cy="8.6" r="1.35"/></svg> Commander: You have been promoted to ${tempLegion.title}! A cup of Falernian wine for the glory you've won. <svg viewBox="0 0 24 24" width="14" height="14" style="vertical-align:-2px;margin-left:2px" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9.5 3h5v1.8h-5z"/><path d="M9 4.6h6v0.7h-6z"/><path d="M9.3 5.4c-.1 1.2-.4 1.9-.8 2.5 2.5.6 3.4.6 6 0-.4-.6-.7-1.3-.8-2.5z"/><path d="M6.6 8.4c.75-.55 1.4-.8 2.1-.85 1.15.75 3.35.75 4.5 0 .7.05 1.35.3 2.1.85 1.4 2.5 1.25 5.9-.85 7.9-.85.8-1.9 1.25-3.15 1.25s-2.3-.45-3.15-1.25c-2.1-2-2.25-5.4-.85-7.9z"/></svg>`;
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
    // opening.mode ('master' | 'club') records which explorer this specific
    // position should be evaluated against — set once, at capture time (see
    // services/practiceOpeningsStore.js) — rather than always using the
    // Club/Lichess explorer regardless of where the line came from.
    this.aiSource = opening.mode === 'master' ? 'master' : 'lichess';
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

  // Used by "Continue Campaign" on the end-game summary: unlike startBattle()
  // (which immediately begins the next game), this clears playerColor so the
  // routing in App.jsx falls back to ColorChoiceScreen (Master/Club Legion)
  // for the current aiSource, letting the player see updated rank/merit
  // before choosing to start the next battle.
  returnToCampaign() {
    console.log('🏛️ returnToCampaign() called — playerColor before:', this.playerColor, 'aiSource:', this.aiSource);
    if (typeof RomanBattleEffects !== 'undefined') {
      RomanBattleEffects.stopMusic();
    }
    this.playerColor = null;
    this.showingAnalysis = false;
    this.resetGameState();
    console.log('🏛️ returnToCampaign() done — playerColor after:', this.playerColor);
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
    this.apiErrorSource = null;
    this.evalHealthChecked = false;
    this.evalHealthCheckInFlight = false;
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
    console.log('[ChessTheoryApp handleClick]', { row, col, playerColor: this.playerColor, turn: this.game.turn(), selected: this.selected, gameOver: this.game.isGameOver() });
    if (this.game.turn() !== this.playerColor || this.game.isGameOver()) return;
    const square = 'abcdefgh'[col] + (8 - row);
    console.log('[ChessTheoryApp square]', { row, col, square, selected: this.selected });

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
        // Don't block the repaint on the Explorer round-trip: score the move
        // in the background and re-persist state once it resolves. Final
        // scoring (stopGameDueToThinTheory) still awaits this promise.
        this.pendingQualityCheck = this.checkMoveQuality(preMoveFEN, moveUCI)
          .then(() => this.saveActiveGameState());
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
    // Don't block the repaint on the Explorer round-trip: score the move in
    // the background and re-persist state once it resolves. Final scoring
    // (stopGameDueToThinTheory) still awaits this promise.
    this.pendingQualityCheck = this.checkMoveQuality(preMoveFEN, moveUCI)
      .then(() => this.saveActiveGameState());
    this.saveActiveGameState();
    this.selected = null;
    this.theoryMessageVisible = false;
    this.render();
  }

  async checkMoveQuality(prevFEN, playerUCI) {
    try {
      this.qualityTrackedMoves++;

      // Practice openings already begin from a curated mid-opening FEN, so
      // every player move should be judged. Campaign battles still retain
      // the original four-move opening grace period.
      const skippedQualityMoves = this.mode === 'practice' ? 0 : SKIP_QUALITY_MOVES;
      if (this.playerMoves <= skippedQualityMoves) {
        this.topMoveChoices++;
        console.log(`⭐️ Opening book move ${this.playerMoves} - auto-counted as top 3 (${this.topMoveChoices}/${this.qualityTrackedMoves})`);
        return;
      }

      const data = await ChessAPI.queryExplorer(this.aiSource, prevFEN);

      if (!data.moves || data.moves.length === 0) {
        console.log(`⚠️ No explorer data available for quality check (${this.topMoveChoices}/${this.qualityTrackedMoves})`);
        return;
      }

      // Delegate the actual "was this a quality move?" decision to Scoring,
      // so the live game and the PGN score tester always run identical
      // analysis (see scoring.js for the full rules).
      const result = Scoring.assessMoveQuality(data, playerUCI, this.playerColor, this.aiSource);

      if (result.moveIndex === -1) {
        console.log(`❌ Move not found in explorer data (${this.topMoveChoices}/${this.qualityTrackedMoves})`);
        return;
      }

      if (result.counted) {
        this.topMoveChoices++;
        console.log(`✅ Quality move! Rank: ${result.moveIndex + 1} (${result.reason}) (${this.topMoveChoices}/${this.qualityTrackedMoves})`);
      } else {
        console.log(`❌ Not a quality move, rank: ${result.moveIndex + 1} (${result.reason || 'not-top'}) (${this.topMoveChoices}/${this.qualityTrackedMoves})`);
      }
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
      const apologyText = `<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-right:2px" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M7.8 2.2 11.3 9.2 8.9 10.4 5.4 3.4z"/><path d="M16.2 2.2 12.7 9.2 15.1 10.4 18.6 3.4z"/><circle cx="12" cy="15.4" r="6.4"/><path d="M12 12.4 13 14.6 15.4 14.9 13.7 16.5 14.1 18.9 12 17.7 9.9 18.9 10.3 16.5 8.6 14.9 11 14.6Z" fill="#241f19"/></svg> <strong>Commander speaks:</strong><br><br>"I'm sorry, soldier. I have not seen this position on the battlefield."`;
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
        this.theoryMessage = `<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-right:2px" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M7.8 2.2 11.3 9.2 8.9 10.4 5.4 3.4z"/><path d="M16.2 2.2 12.7 9.2 15.1 10.4 18.6 3.4z"/><circle cx="12" cy="15.4" r="6.4"/><path d="M12 12.4 13 14.6 15.4 14.9 13.7 16.5 14.1 18.9 12 17.7 9.9 18.9 10.3 16.5 8.6 14.9 11 14.6Z" fill="#241f19"/></svg> <strong>Commander speaks:</strong><br><br>${line}`;
        this.theoryMessageVisible = true;
        if (this.mode !== 'practice') {
          this.hintUsed = true;
        }
        return;
      }

      const top3 = movesWithStats.slice(0, 3);
      const mostPopular = top3.reduce((max, move) => move.games > max.games ? move : max);
      const highestWin = top3.reduce((max, move) => move.winPct > max.winPct ? move : max);

      commanderText = `<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-right:2px" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M7.8 2.2 11.3 9.2 8.9 10.4 5.4 3.4z"/><path d="M16.2 2.2 12.7 9.2 15.1 10.4 18.6 3.4z"/><circle cx="12" cy="15.4" r="6.4"/><path d="M12 12.4 13 14.6 15.4 14.9 13.7 16.5 14.1 18.9 12 17.7 9.9 18.9 10.3 16.5 8.6 14.9 11 14.6Z" fill="#241f19"/></svg> <strong>Commander speaks:</strong><br><br>"Soldier, I have seen this position many times.`;

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

  endGameApiError(source = 'explorer') {
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
    this.apiErrorSource = source;
    if (this._notify) this._notify();
  }

  // Fired once per game, right after the first move lands (see render()).
  // The Explorer API failing is caught immediately because every move
  // depends on it, but the evaluation API (chess-api.com) is only ever
  // called once, at game end, to score the result — so a silent outage
  // there wouldn't surface until after a full game had already been played,
  // and the fallback would score it as an artificial 0.0 instead of failing
  // loudly. This proves the eval API is actually reachable early, so a dead
  // service ends the game immediately instead of wasting the player's game
  // and awarding a bogus result.
  async checkEvalApiHealth() {
    try {
      const rawEval = await ChessAPI.getEvaluation(this.game.fen(), this.evalCache);
      this.evalHealthCheckInFlight = false;
      if (rawEval === null) {
        console.error('❌ Evaluation API is unreachable.');
        this.endGameApiError('eval');
        return;
      }
      this.evalHealthChecked = true;
      if (this._notify) this._notify();
    } catch (e) {
      this.evalHealthCheckInFlight = false;
      console.error('❌ Evaluation API health check failed:', e);
      this.endGameApiError('eval');
    }
  }

  async stopGameDueToThinTheory() {
    // The last player move's quality check may still be running in the
    // background (see handleClick/handleDragMove) — final scoring reads
    // topMoveChoices/qualityTrackedMoves, so it must wait for it here.
    if (this.pendingQualityCheck) {
      try {
        await this.pendingQualityCheck;
      } catch (e) {
        // checkMoveQuality already catches its own errors internally; this
        // is just a safety net.
      }
    }

    this.clearActiveGameState();

    // A checkmate is a decisive game result, not an engine-evaluation case.
    // chess.js leaves the losing side to move after mate, so this tells us
    // whether the player delivered it or was checkmated. Scoring.finalizeGameScore
    // applies this before either campaign's normal scoring formula and avoids
    // relying on a remote evaluation API, which may report a terminal position
    // as 0.0. This is the same finalizer the PGN score tester uses, so a live
    // battle and a re-tested PGN always score identically.
    const isCheckmate = this.game.isCheckmate();
    const playerDeliveredCheckmate = isCheckmate && this.game.turn() !== this.playerColor;

    const result = await Scoring.finalizeGameScore({
      fen: this.game.fen(),
      isCheckmate,
      playerDeliveredCheckmate,
      playerColor: this.playerColor,
      playerMoves: this.playerMoves,
      topMoveChoices: this.topMoveChoices,
      qualityTrackedMoves: this.qualityTrackedMoves,
      aiSource: this.aiSource,
      evalCache: this.evalCache,
    });

    if (result.error) {
      // Passed the start-of-game health check but died before scoring —
      // rare, but still must not save a result built on a fabricated 0.0.
      console.error('❌ Evaluation API failed at game end.');
      this.endGameApiError('eval');
      return;
    }

    this.finalPlayerEval = result.finalPlayerEval;
    const score = result.score;
    const penaltyReason = result.penaltyReason;
    const battleRank = result.battleRank;
    const shortSkirmishApplied = result.shortSkirmishApplied;

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
        isPractice: true,
        shortSkirmishApplied
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
      isPractice: false,
      shortSkirmishApplied
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

  // Called from the Analysis screen's "Add to Practice" button (post-Master
  // or post-Club battles only — see AnalysisScreen.jsx). Captures whatever
  // position is currently on the analysis board, tagged with the side the
  // player played and which explorer (master/club) this battle used, so
  // practice mode evaluates it the same way later. `name` comes from the
  // small prompt shown at click time, since there's no reliable way to
  // derive an opening name from an arbitrary mid-game position.
  addAnalysisPositionToPractice(name) {
    if (!this.analysisBoard || !this.analysisBoard.analysisGame) {
      return { ok: false, error: 'Analysis board not available.' };
    }
    const fen = this.analysisBoard.analysisGame.fen();
    const orientation = this.playerColor === 'w' ? 'white' : 'black';
    const mode = this.aiSource === 'master' ? 'master' : 'club';
    return addOpening({ name, fen, orientation, mode, source: 'captured' });
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
    const gameActive = this.playerColor && this.aiSource &&
      !(this.mode === 'practice' && !this.practiceOpening) &&
      !(this.gameEnded && this.endGameData) && !this.showingAnalysis;

    if (this.game.turn() !== this.playerColor && gameActive) {
      const currentFEN = this.game.fen();
      if (this.lastAIMoveFEN !== currentFEN) {
        setTimeout(() => this.aiMove(), 800);
      }
    }

    if (gameActive) {
      this.queryExplorer();
    }

    // One-shot check, fired the instant the game's first move is on the
    // board (by either side) — see checkEvalApiHealth() for why this can't
    // just wait for the Explorer check above to catch it.
    if (gameActive && !this.evalHealthChecked && !this.evalHealthCheckInFlight &&
        this.game.history().length >= 1) {
      this.evalHealthCheckInFlight = true;
      this.checkEvalApiHealth();
    }

    if (this._notify) this._notify();
  }
}

export default ChessTheoryApp;
