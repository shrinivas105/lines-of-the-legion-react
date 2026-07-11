// game-logic.js - Core chess game logic and state management
// UPDATED: Hidden accuracy bonus system (eval >= +0.5)

class ChessTheoryApp {
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
    this.ui = new UIRenderer(this);
    this.analysisBoard = new AnalysisBoard(this);

    // Initialize auth and render
    this.init();
  }

  async init() {
    await this.auth.initialize();
    await this.checkForAbandonedBattle();
    this.render();
  }

  // ─── Anti-refresh-exploit guard ───────────────────────────────────────
  // Persists just enough state after every move so that a refresh, tab
  // close, or crash mid-battle can't be used to dodge a bad rank. Practice
  // battles are unranked and are simply discarded — nothing to forfeit.
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

  // Called once on startup (after auth/cloud data is loaded). If a ranked
  // battle was left mid-fight, resolve it honestly through the exact same
  // scoring path a normal game-over uses — no separate, weaker code path
  // to keep in sync, and no way to walk away from a losing position for free.
  async checkForAbandonedBattle() {
    const saved = localStorage.getItem('chessTheoryActiveGame');
    if (!saved) return;

    // Consume it immediately (at-most-once): if resolution itself gets
    // interrupted, the battle is simply lost, never double-scored.
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

    // Let the normal end-of-battle summary render first, then flag it.
    setTimeout(() => {
      const app = document.getElementById('app');
      if (app) {
        const banner = document.createElement('div');
        banner.style.cssText = 'background:#5a1a1a;color:#fff;padding:10px 16px;' +
          'text-align:center;font-weight:bold;border-bottom:2px solid var(--roman-gold, #d4af37);';
        banner.textContent = '⚠️ Your last battle was interrupted and scored as found — no retreat, soldier.';
        app.prepend(banner);
      }
    }, 100);
  }

  goHome() {
    this.mode = null;
    this.playerColor = null;
    this.aiSource = null;
    this.practiceOpening = null;
    this.practiceStartingPosition = false;
    this.gameEnded = false;
    this.endGameData = null;
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
        this.rankChangeMessage = `Demotion !! <br>Your honor has diminished.You are now ${Scoring.getLegionRank(newMerit).title}.`;
        this.rankChangeType = 'demotion';
      }
      rankChanged = true;
      this.setRecentBattleRanks(this.aiSource, []);
    } else if (Scoring.canPromote(oldLegion.title, newMerit, recentRanks) && tempLegion.level > oldLegion.level) {
      newMerit = tempLegion.thresholds[tempLegion.level];
      this.rankChangeMessage = `Promotion !! <br>Ave! Rome honors your service.You are now ${tempLegion.title}.`;
      this.rankChangeType = 'promotion';
      rankChanged = true;
      this.setRecentBattleRanks(this.aiSource, []);
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
    const summaryEls = document.querySelectorAll('#endSummary');
    const theoryEls = document.querySelectorAll('#theoryMessage');
    summaryEls.forEach(el => {
      el.style.display = 'none';
    });
    theoryEls.forEach(el => {
      el.style.display = 'none';
      el.innerHTML = '';
    });
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
    const summaryEls = document.querySelectorAll('#endSummary');
    const theoryEls = document.querySelectorAll('#theoryMessage');
    summaryEls.forEach(el => {
      el.style.display = 'none';
    });
    theoryEls.forEach(el => {
      el.style.display = 'none';
      el.innerHTML = '';
    });
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
    
	// STOP the music here
    if (typeof RomanBattleEffects !== 'undefined') {
      RomanBattleEffects.stopMusic();
    }
	
    console.log(`🎯 Starting battle - Last color: ${lastColor || 'none'}, Next color: ${nextColor}`);
    
    // Set player color and start game
    this.playerColor = nextColor;
    this.hintUsed = false;
    this.resetGameState();
    this.render();
  }

  renderColorChoice() {
    this.ui.renderColorChoice();
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
      this.gameEnded = false; // ← ADDED THIS
  this.endGameData = null; // ← ADDED THIS
  this.clearActiveGameState();
  }

  async resetStats() {
    if (!confirm('Are you sure you want to reset all your stats? This cannot be undone.')) return;

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

      // If API is unreachable, end the game cleanly without scoring
      if (data.apiError) {
        console.error('❌ Lichess Explorer API is unreachable.');
        this.endGameApiError();
        return;
      }

      const totalGames = (data.white || 0) + (data.draws || 0) + (data.black || 0);
      this.gameCount = totalGames;
      const countEl = document.getElementById('gameCount');
      if (countEl) {
        countEl.textContent = totalGames === 0 
          ? 'Position data unavailable — continuing...' 
          : `Position reached ${totalGames.toLocaleString()} times`;
      }
    } catch (e) {
      console.error('Explorer query failed:', e);
    }
  }

  async handleClick(row, col) {
    if (this.game.turn() !== this.playerColor || this.game.game_over()) return;
    const square = 'abcdefgh'[col] + (8 - row);

    if (this.selected) {
      const moveOptions = { from: this.selected, to: square, promotion: 'q' };
      const preMoveFEN = this.game.fen();
      let move = this.game.move(moveOptions);
      if (move) {
        this.lastMove = { from: move.from, to: move.to };
        this.playerMoves++;
        
        // Play sound effects based on move type, but mute in practice mode
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
        document.getElementById('theoryMessage').style.display = 'none';
        this.render();
        return;
      }
      this.selected = null;
    }

    const piece = this.game.get(square);
    if (piece && piece.color === this.playerColor) {
      this.selected = square;
    }
    this.ui.renderBoard();
  }

  async handleDragMove(from, to) {
    if (this.game.turn() !== this.playerColor || this.game.game_over()) return;
    const moveOptions = { from, to, promotion: 'q' };
    const preMoveFEN = this.game.fen();
    const move = this.game.move(moveOptions);
    if (!move) {
      this.dragSource = null;
      this.ui.renderBoard();
      return;
    }

    this.lastMove = { from: move.from, to: move.to };
    this.playerMoves++;
    this.dragSource = null;

    if (typeof RomanBattleEffects !== 'undefined') {
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
    document.getElementById('theoryMessage').style.display = 'none';
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
        // Check if this "top move" is actually bad compared to other top moves
        const playerMove = data.moves[moveIndex];
        const playerTotalGames = playerMove.white + playerMove.draws + playerMove.black;
        
        // Calculate player's win percentage and opponent's win percentage
        let playerWinPct, opponentWinPct;
        if (this.playerColor === 'w') {
          playerWinPct = (playerMove.white / playerTotalGames) * 100;
          opponentWinPct = (playerMove.black / playerTotalGames) * 100;
        } else {
          playerWinPct = (playerMove.black / playerTotalGames) * 100;
          opponentWinPct = (playerMove.white / playerTotalGames) * 100;
        }
        
        const playerWinRatio = opponentWinPct > 0 ? playerWinPct / opponentWinPct : 999;
        
        // Get other top 3 moves (excluding player's move)
        const otherTopMoves = data.moves.slice(0, 3).filter((_, idx) => idx !== moveIndex);
        
        if (otherTopMoves.length >= 2) {
          // Calculate win percentages for other top moves
          const otherWinPercentages = otherTopMoves.map(move => {
            const total = move.white + move.draws + move.black;
            if (this.playerColor === 'w') {
              return (move.white / total) * 100;
            } else {
              return (move.black / total) * 100;
            }
          });
          
          // Calculate win ratios for other top moves
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
          
          // Condition 1: Check if gap is > 20%
          const lowestOtherWinPct = Math.min(...otherWinPercentages);
          const winPctGap = lowestOtherWinPct - playerWinPct;
          const condition1 = winPctGap > 20;
          
          // Condition 2: Player ratio < 1.0 AND both other moves > 1.0
          const condition2 = playerWinRatio < 1.0 && otherWinRatios.every(ratio => ratio > 1.0);
          
          // If BOTH conditions are true, this is a bad top move
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
      
      if (trickyConfig.enabled && moveIndex >= (trickyConfig.minRank - 1) && moveIndex <= (trickyConfig.maxRank - 1)) {
        const move = data.moves[moveIndex];
        const totalGames = move.white + move.draws + move.black;
        
        // Calculate win percentages
        let playerWinPct, opponentWinPct;
        if (this.playerColor === 'w') {
          playerWinPct = (move.white / totalGames) * 100;
          opponentWinPct = (move.black / totalGames) * 100;
        } else {
          playerWinPct = (move.black / totalGames) * 100;
          opponentWinPct = (move.white / totalGames) * 100;
        }
        
        const winAdvantage = playerWinPct - opponentWinPct;
        
        // Find the appropriate tier based on game count
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

  const finishHint = (html) => {
    const msgEl = document.getElementById('theoryMessage');
    msgEl.innerHTML = html;
    msgEl.style.display = 'block';
    if (this.mode !== 'practice') {
      this.hintUsed = true;
      const hintBtn = document.getElementById('hintBtn');
      if (hintBtn) {
        hintBtn.disabled = true;
        hintBtn.textContent = '✓ Consulted';
      }
    }
  };

  const apologyText = `🎖️ <strong>Commander speaks:</strong><br><br>"I'm sorry, soldier. I have not seen this position on the battlefield."`;

  const defeatLines = [
    `"Soldier... every path from here leads to ruin. This ground is already lost."`,
    `"There is no glory to be found here. The enemy holds every road we could take."`,
    `"I will not lie to you, soldier — this battle is already lost. Fight on, but expect no miracles."`
  ];

  try {
    const data = await ChessAPI.queryExplorer(this.aiSource, fen);
    const topMoves = data.moves ? data.moves.slice(0, 5) : [];

    if (topMoves.length === 0) {
      finishHint(apologyText);
      return;
    }

    const totalGames = (data.white || 0) + (data.draws || 0) + (data.black || 0);

    // Same threshold for both Masters and Club sources.
    const threshold = 50;

    // Win % (for the player's color) for every one of the top 5 moves.
    const movesWithStats = topMoves.map(move => {
      const moveTotal = move.white + move.draws + move.black;
      const winPct = moveTotal > 0
        ? (this.playerColor === 'w' ? (move.white / moveTotal) * 100 : (move.black / moveTotal) * 100)
        : 0;
      return { san: move.san, games: moveTotal, winPct };
    });

    // Not enough data to say anything meaningful — apologize instead of guessing.
    if (totalGames < threshold || movesWithStats.length < 3) {
      finishHint(apologyText);
      return;
    }

    // Plenty of data, but nothing here actually wins for us.
    const anyAbove40 = movesWithStats.some(m => m.winPct > 40);
    if (!anyAbove40) {
      const line = defeatLines[Math.floor(Math.random() * defeatLines.length)];
      finishHint(`🎖️ <strong>Commander speaks:</strong><br><br>${line}`);
      return;
    }

    // Intelligent recommendation, built from the top 3 moves.
    const top3 = movesWithStats.slice(0, 3);

    // Find most popular (most games)
    const mostPopular = top3.reduce((max, move) => move.games > max.games ? move : max);

    // Find highest win percentage
    const highestWin = top3.reduce((max, move) => move.winPct > max.winPct ? move : max);

    let commanderText = `🎖️ <strong>Commander speaks:</strong><br><br>"Soldier, I have seen this position many times.`;

    // Check if same move is both most popular AND highest win%
    if (mostPopular.san === highestWin.san) {
      commanderText += ` <strong>${mostPopular.san}</strong> is the most popular and strongest path — tried ${mostPopular.games.toLocaleString()} times with ${mostPopular.winPct.toFixed(1)}% victories!`;

      // Show second best option
      const remaining = top3.filter(m => m.san !== mostPopular.san);
      if (remaining.length > 0) {
        const secondBest = remaining[0];
        commanderText += ` Also consider <strong>${secondBest.san}</strong> — ${secondBest.games.toLocaleString()} games, ${secondBest.winPct.toFixed(1)}% win rate.`;
      }
    } else {
      // Different moves for popularity and win rate
      commanderText += ` The most popular path is <strong>${mostPopular.san}</strong> — tried ${mostPopular.games.toLocaleString()} times, ${mostPopular.winPct.toFixed(1)}% victories.`;
      commanderText += ` Going for blood? March with <strong>${highestWin.san}</strong> — ${highestWin.winPct.toFixed(1)}% victories.`;
    }

    // Other alternatives from the full top 5, excluding what's already shown,
    // and only worth mentioning if their win rate clears 40%.
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

    finishHint(commanderText);
  } catch (error) {
    document.getElementById('theoryMessage').innerHTML = '<em>Unable to fetch hints.</em>';
    document.getElementById('theoryMessage').style.display = 'block';
  }
}

  async aiMove() {
    const fen = this.game.fen();
    if (this.lastAIMoveFEN === fen) return;
    this.lastAIMoveFEN = fen;
    
    try {
      const data = await ChessAPI.queryExplorer(this.aiSource, fen);

      // If API is unreachable, end the game cleanly without scoring
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
      
      // Calculate total from top 5 moves only
      const top5Total = data.moves.reduce((sum, m) => 
        sum + m.white + m.draws + m.black, 0);
      
      // Filter out moves < 10% of top 5 total
      const MIN_PERCENTAGE = 0.10;
      const minMoveGames = top5Total * MIN_PERCENTAGE;
      
      const filteredMoves = data.moves.filter(m => {
        const moveGames = m.white + m.draws + m.black;
        return moveGames >= minMoveGames;
      });
      
      // If all filtered out (edge case), keep at least top move
      const movesToUse = filteredMoves.length > 0 ? filteredMoves : [data.moves[0]];
      
      // Calculate new total from filtered moves
      const filteredTotal = movesToUse.reduce((sum, m) => 
        sum + m.white + m.draws + m.black, 0);
      
      // Weighted random selection from filtered moves
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
      if (selectedMove.san === 'O-O' || selectedMove.san === 'O-O-O') {
        move = this.game.move(selectedMove.san);
      } else {
        const uci = selectedMove.uci;
        move = this.game.move({ 
          from: uci.slice(0,2), 
          to: uci.slice(2,4), 
          promotion: uci.length === 5 ? uci[4] : null 
        });
      }
      
      if (move) {
        this.lastMove = { from: move.from, to: move.to };
        
        // Play sound effects for AI moves, but mute in practice mode
        if (this.mode !== 'practice' && typeof RomanBattleEffects !== 'undefined') {
          if (move.captured) {
            RomanBattleEffects.playCaptureSound();
          } else if (move.promotion) {
            RomanBattleEffects.playPromotionSound();
          } else {
            RomanBattleEffects.playMoveSound();
          }
        }
        
        this.ui.renderBoard();
        this.saveActiveGameState();

        // If the AI's move ended the game (checkmate, stalemate, etc.), stop here
        if (this.game.game_over()) {
          this.stopGameDueToThinTheory();
          return;
        }

        this.queryExplorer();
      }
    } catch (error) {
      console.error('aiMove error:', error);
    }
  }

  endGameApiError() {
    // End the game cleanly — API was unreachable, no scoring or rank/merit changes applied.
    this.clearActiveGameState();
    this.gameEnded = true;
    this.endGameData = null;

    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                  min-height:400px;gap:24px;padding:32px;text-align:center;">
        <div style="font-size:3rem;">⚠️</div>
        <div style="color:var(--roman-gold);font-size:1.3rem;font-weight:bold;
                    text-shadow:2px 2px 4px rgba(0,0,0,0.8);">
          Lichess Explorer Unavailable
        </div>
        <div style="color:#fff;font-size:0.95rem;max-width:400px;line-height:1.6;
                    text-shadow:1px 1px 3px rgba(0,0,0,0.8);">
          The Lichess opening database is currently unreachable — this is likely a
          temporary outage. <strong>No rank or merit changes have been applied.</strong>
        </div>
        <div style="color:#aaa;font-size:0.8rem;">
          Please try again in a few minutes.
        </div>
        <button id="apiErrorHomeBtn"
                style="margin-top:8px;padding:12px 32px;background:var(--roman-gold);
                       color:#1a0a00;font-weight:bold;font-size:1rem;border:none;
                       border-radius:6px;cursor:pointer;">
          ← Return to Home
        </button>
      </div>
    `;

    // Wire up button directly using 'this' — avoids relying on any global app reference
    document.getElementById('apiErrorHomeBtn').addEventListener('click', () => this.goHome());
  }

  async stopGameDueToThinTheory() {
    this.clearActiveGameState();
    const fen = this.game.fen();
    const rawEval = await ChessAPI.getEvaluation(fen, this.evalCache);
    this.finalPlayerEval = Scoring.getPlayerEval(rawEval, this.playerColor);
    
    // Get score with hidden accuracy bonus (user doesn't see bonus breakdown)
    const scoreResult = Scoring.getTotalScore(
      this.playerMoves, 
      this.topMoveChoices, 
      this.finalPlayerEval,
      this.aiSource,
      this.qualityTrackedMoves
    );
    
    let score = scoreResult.score;
    let penaltyReason = scoreResult.penaltyReason;

    // Checkmate overrides: player delivers checkmate → 100 (Imperator), player gets checkmated → 0 (Levy)
    if (this.game.in_checkmate()) {
      const playerWon = this.game.turn() !== this.playerColor; // loser's turn after checkmate
      if (playerWon) {
        score = 100;
        penaltyReason = null;
      } else {
        score = 0;
        penaltyReason = null;
      }
    }

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

      this.ui.renderEndGameSummary(battleRank, moveQuality, displayEval, this.recentGames, true);
      return;
    }

    // ─── CRITICAL FIX: Check promotion/demotion BEFORE updating battle history ───
    // This ensures the "last 5 battles" used for promotion requirements
    // is the array from BEFORE adding this new battle.
    // Otherwise, if you have a Triarius as your 6th-oldest battle,
    // it gets shifted out BEFORE the promotion check, causing unfair resets.
    const recentRanksBeforeUpdate = this.getRecentBattleRanks(this.aiSource);
    const rankChanged = await this.updateLegionMerit(score, battleRank.title, recentRanksBeforeUpdate);

    // Only add the new battle to history if no promotion/demotion occurred
    // (promotion/demotion clears history, so we shouldn't re-add the triggering battle)
    if (!rankChanged) {
      const recentRanks = this.getRecentBattleRanks(this.aiSource);
      recentRanks.push(battleRank.title);
      if (recentRanks.length > 5) recentRanks.shift();
      this.setRecentBattleRanks(this.aiSource, recentRanks);
      
      // Save the updated battle history (merit was already saved in updateLegionMerit)
      await this.saveAllProgress();
    }

    // Use qualityTrackedMoves for display quality percentage
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

    this.ui.renderEndGameSummary(battleRank, moveQuality, displayEval, gamesToShow, false);
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
    alert('Analysis board not available. Please refresh the page.');
    return;
  }
  
  // Show loading indicator with progress bar
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; gap: 20px; padding: 20px;">
        <div style="font-size: 3rem; animation: pulse 2s ease-in-out infinite;">⚔️</div>
        <div style="color: var(--roman-gold); font-size: 1.2rem; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">
          Analyzing Battle...
        </div>
        <div style="color: #fff; font-size: 0.9rem; text-shadow: 1px 1px 3px rgba(0,0,0,0.8);">
          <span id="loadingMessage">Evaluating all positions...</span>
        </div>
        
        <!-- Progress Bar -->
        <div style="width: 100%; max-width: 400px; background: rgba(0,0,0,0.5); border-radius: 10px; padding: 4px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);">
          <div id="progressBar" style="width: 0%; height: 20px; background: linear-gradient(90deg, var(--roman-gold), #d4af37, var(--roman-gold)); border-radius: 8px; transition: width 0.3s ease; box-shadow: 0 2px 8px rgba(218, 165, 32, 0.6);"></div>
        </div>
        
        <div style="color: #ddd; font-size: 0.75rem; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">
          <span id="progressText">0%</span>
        </div>
      </div>
      
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      </style>
    `;
  }
  
  // Make the analysis board accessible globally for onclick handlers
  window.analysisBoard = this.analysisBoard;
  
  await this.analysisBoard.initializeAnalysis();
}


render() {
  if (this.mode === 'practice' && !this.practiceOpening) {
    this.ui.renderPracticePicker();
    return;
  }

  if (!this.aiSource) {
    this.ui.renderMenu();
    return;
  }
  if (!this.playerColor) {
    this.ui.renderColorChoice();
    return;
  }

  // If game has ended, show end summary with final board position
  if (this.gameEnded && this.endGameData) {
    // First render the end summary (which creates container if needed)
    this.ui.renderEndGameSummary(
      this.endGameData.battleRank,
      this.endGameData.moveQuality,
      this.endGameData.displayEval,
      this.endGameData.gamesToShow,
      this.endGameData.isPractice
    );
    
    // Then render the board with final position (after container exists)
    setTimeout(() => {
      this.ui.renderBoard();
    }, 50);
    return;
  }

  this.ui.renderBoard();

  // Catch checkmate, stalemate, or any other terminal position
  if (this.game.game_over()) {
    this.stopGameDueToThinTheory();
    return;
  }

  this.queryExplorer();

  if (this.game.turn() !== this.playerColor) {
    const currentFEN = this.game.fen();
    if (this.lastAIMoveFEN !== currentFEN) {
      setTimeout(() => this.aiMove(), 800);
    }
  }
}
}