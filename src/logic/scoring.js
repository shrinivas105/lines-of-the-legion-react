// scoring.js - Battle and Legion Scoring System
// Uses configuration from config.js
// (import added for ES module conversion — config.js constants were globals
// in the legacy <script> tag setup; logic itself is unchanged)
import {
  ACCURACY_BONUS,
  MASTER_THEORY_DEPTH,
  CLUB_WEIGHTS,
  CLUB_PENALTY_MULTIPLIERS,
  CLUB_EVAL_THRESHOLDS,
  BATTLE_RANK_THRESHOLDS,
} from '../config';

class Scoring {
  static getPlayerEval(e, c) { 
    return c === 'b' ? -e : e; 
  }
  
  static getMoveQuality(t, p) { 
    return p > 0 ? Math.round((t / p) * 100) : 0; 
  }
  
  // Calculate accuracy bonus based on moves, quality, and evaluation
  // Hidden bonus - only awarded when eval >= +0.5
  // Skipped entirely for Master (depth-based scoring makes this redundant)
  static getAccuracyBonus(playerMoves, qualityPercent, playerEval) {
    // Must meet quality AND evaluation requirements
    if (qualityPercent < ACCURACY_BONUS.minQuality || playerEval < ACCURACY_BONUS.minEval) {
      return { bonus: 0, tier: null };
    }
    
    for (const tier of ACCURACY_BONUS.tiers) {
      if (playerMoves >= tier.minMoves && playerMoves <= tier.maxMoves) {
        return { bonus: tier.bonus, tier: tier.name };
      }
    }
    
    return { bonus: 0, tier: null };
  }

  // ──────────────────────────────────────────────────────────────
  // MASTER SCORING: Zoned eval piecewise function
  // Reads MASTER_THEORY_DEPTH.eval config for all thresholds.
  //
  //   eval < equalMin            → scales from -goodSwing down to -winningSwing
  //   equalMin ≤ eval < goodMax  → scales from -goodSwing up to 0
  //   -equalMax ≤ eval ≤ equalMax → 0  (dead zone)
  //   equalMax < eval ≤ goodMax  → scales from 0 up to +goodSwing
  //   eval > goodMax             → scales from +goodSwing up to +winningSwing
  // ──────────────────────────────────────────────────────────────
  static getEvalAdjustment(eval_) {
    const cfg = MASTER_THEORY_DEPTH.eval;
    const { equalMin, equalMax, goodMax, winningCap, goodSwing, winningSwing } = cfg;

    // Clamp eval to ± winningCap before calculating
    const e = Math.max(-winningCap, Math.min(winningCap, eval_));

    // Equal zone — flat, no effect
    if (e >= equalMin && e <= equalMax) {
      return 0;
    }

    // Positive side
    if (e > equalMax) {
      if (e <= goodMax) {
        // Good+ zone: scales 0 → +goodSwing
        return ((e - equalMax) / (goodMax - equalMax)) * goodSwing;
      } else {
        // Winning+ zone: scales +goodSwing → +winningSwing
        return goodSwing + ((e - goodMax) / (winningCap - goodMax)) * (winningSwing - goodSwing);
      }
    }

    // Negative side (mirror)
    if (e < equalMin) {
      if (e >= -goodMax) {
        // Good- zone: scales 0 → -goodSwing
        return ((e - equalMin) / (goodMax - equalMax)) * goodSwing;
      } else {
        // Winning- zone: scales -goodSwing → -winningSwing
        return -goodSwing + ((e + goodMax) / (winningCap - goodMax)) * (winningSwing - goodSwing);
      }
    }

    return 0; // fallback (shouldn't reach)
  }

  static getTotalScore(m, t, e, source = 'master', qualityTrackedMoves = null) {
    // ─── MASTER: depth-based zoned scoring ───────────────────────
    if (source === 'master') {
      const theoryDepth = m; // game ends at theory exit, so playerMoves = theory depth

      // 1. Pick base score from depth tier
      let baseScore = MASTER_THEORY_DEPTH.tiers[MASTER_THEORY_DEPTH.tiers.length - 1].baseScore; // default: Levy
      for (const tier of MASTER_THEORY_DEPTH.tiers) {
        if (theoryDepth >= tier.minMoves) {
          baseScore = tier.baseScore;
          break;
        }
      }

      // 2. Eval adjustment (piecewise zoned)
      const evalAdj = this.getEvalAdjustment(e);

      // 3. Quality adjustment
      const movesForQuality = qualityTrackedMoves !== null ? qualityTrackedMoves : m;
      const qualityPercent = this.getMoveQuality(t, movesForQuality);
      const qualAdj = ((qualityPercent - 50) / 50) * MASTER_THEORY_DEPTH.qualitySwingMax;

      // 4. Final score — clamp to [0, 100]
      const finalScore = Math.round(Math.min(100, Math.max(0, baseScore + evalAdj + qualAdj)));

      return {
        score: finalScore,
        penaltyReason: ''  // no penalty system in Master
      };
    }

    // ─── CLUB: original scoring logic (unchanged) ────────────────
    const weights = CLUB_WEIGHTS;
    const penaltyMultipliers = CLUB_PENALTY_MULTIPLIERS;
    const evalThresholds = CLUB_EVAL_THRESHOLDS;
    
    // Calculate component scores
    const ms = m * weights.movesMultiplier * weights.moves;
    
    // Use qualityTrackedMoves if provided, otherwise fall back to total moves
    const movesForQuality = qualityTrackedMoves !== null ? qualityTrackedMoves : m;
    const qualityPercent = this.getMoveQuality(t, movesForQuality);
    const qs = qualityPercent * weights.quality;
    
    const es = e < evalThresholds.catastrophic 
      ? 0 
      : Math.max(0, (e + 3) * weights.evalMultiplier * weights.evaluation);
    
    let base = ms + qs + es;
    
    // Apply position-based penalty multiplier
    let mul = penaltyMultipliers.acceptable;
    let r = '';
    
    if (e <= evalThresholds.catastrophic) {
      mul = penaltyMultipliers.catastrophic;
      r = 'Total rout! The legions are shattered, banners fallen, the field lost in disgrace.';
    } else if (e < evalThresholds.poor) {
      mul = penaltyMultipliers.poor;
      r = 'Broken lines! The cohort reels under heavy assault, fighting on but losing ground.';
    }
    
    // Apply penalty multiplier to base score
    let penalizedScore = base * mul;
    
    // Calculate hidden accuracy bonus AFTER penalty (only if eval >= +0.5)
    // User does not see this bonus - it's silently added to final score
    const accuracyResult = this.getAccuracyBonus(m, qualityPercent, e);
    const finalScore = penalizedScore + accuracyResult.bonus;
    
    // Cap score based on penalty (but allow bonus to push slightly over)
    const maxScore = mul === penaltyMultipliers.catastrophic ? 30 : 
                     mul === penaltyMultipliers.poor ? 60 : 100;
    
    // Only cap if no bonus, otherwise allow bonus to add to capped score
    const s = accuracyResult.bonus > 0 
      ? Math.round(Math.min(penalizedScore, maxScore) + accuracyResult.bonus)
      : Math.min(Math.round(penalizedScore), maxScore);
    
    // Return WITHOUT bonus information (hidden from user)
    return { 
      score: s, 
      penaltyReason: r
    };
  }
  
  static getBattleRank(s, e, r, source = 'master') {
    const t = BATTLE_RANK_THRESHOLDS;
    let n;

    if (source === 'master') {
      // Master: score already has the rank baked in via depth + zoned eval.
      // Pure score lookup — no eval overrides needed.
      n = s >= t.imperator ? 'Imperator' :
          s >= t.triarius  ? 'Triarius' :
          s >= t.principes ? 'Principes' :
          s >= t.hastatus  ? 'Hastatus' : 'Levy';
    } else {
      // Club: original logic with eval-based overrides (unchanged)
      const evalThresholds = CLUB_EVAL_THRESHOLDS;

      if (e <= evalThresholds.catastrophic) {
        n = 'Levy';
      } else if (e < evalThresholds.poor) {
        n = s >= t.hastatus ? 'Hastatus' : 'Levy';
      } else {
        n = s >= t.imperator ? 'Imperator' : 
            s >= t.triarius  ? 'Triarius' : 
            s >= t.principes ? 'Principes' : 
            s >= t.hastatus  ? 'Hastatus' : 'Levy';
      }
    }
    
    const rks = {
      Levy: { icon: "🪖", title: "Levy", msg: r || "Thrown onto the field unblooded — ranks break at first contact.", sub: "Fundamentals missing. Blunders erase all standing." },
      Hastatus: { icon: "🛡️", title: "Hastatus", msg: r || "You held the front line, shield locked, testing the enemy.", sub: "A sound beginning — discipline and precision needed." },
      Principes: { icon: "⚔️", title: "Principes", msg: r || "You fought with order and purpose, pressing where it mattered.", sub: "Strong theory, reliable structure, few weaknesses." },
      Triarius: { icon: "🦅", title: "Triarius", msg: r || "When the battle wavered, you advanced and broke the stalemate.", sub: "Veteran-level command of position and timing." },
      Imperator: { icon: "👑", title: "Imperator", msg: r || "Victory by design — the battlefield bent to your will.", sub: "Flawless theory, flawless execution." }
    };
    return { ...rks[n], score: s, penaltyReason: r };
  }
  
  static getLegionRank(m = 0) {
    const thresholds = [0, 200, 500, 900, 1300, 1750];
    const rankOrder = ['Recruit', 'Legionary', 'Optio', 'Centurion', 'Tribunus', 'Legatus'];
    let level = 0;
    for (let i = 0; i < thresholds.length; i++) {
      if (m >= thresholds[i]) level = i;
      else break;
    }
    const title = rankOrder[level];
    const iconMap = { Recruit: "🌱", Legionary: "🛡️", Optio: "⚔️", Centurion: "🦅", Tribunus: "🏅", Legatus: "🏆" };
    let nextRank = null, pointsNeeded = 0;
    if (level < rankOrder.length - 1) {
      nextRank = rankOrder[level + 1];
      pointsNeeded = thresholds[level + 1] - m;
    }
    return { title, icon: iconMap[title], merit: m, nextRank, pointsNeeded, rankOrder, thresholds, level };
  }
  
  // Get safety net threshold for a rank (50% of range)
  static getSafetyNetThreshold(rankTitle) {
    const safetyNets = {
      'Legionary': 350,   // 200 + (500-200)*0.5 = 350
      'Optio': 700,       // 500 + (900-500)*0.5 = 700
      'Centurion': 1100,  // 900 + (1300-900)*0.5 = 1100
      'Tribunus': 1525    // 1300 + (1750-1300)*0.5 = 1525
    };
    return safetyNets[rankTitle] || null;
  }
  
  static getDemotionWarning(rankTitle, recentRanks, currentMerit = 0) {
    if (rankTitle === 'Recruit' || recentRanks.length === 0) return null;
    
    const levy = recentRanks.filter(r => r === 'Levy').length;
    const hastatus = recentRanks.filter(r => r === 'Hastatus').length;
    const triarius = recentRanks.filter(r => r === 'Triarius').length;
    const imperator = recentRanks.filter(r => r === 'Imperator').length;
    const eliteCount = triarius + imperator;
    const battlesPlayed = recentRanks.length;
    const battlesLeft = 5 - battlesPlayed;
    
    // Check if player is in safety net zone
    const safetyThreshold = this.getSafetyNetThreshold(rankTitle);
    const inSafetyNet = safetyThreshold && currentMerit >= safetyThreshold;
    
    // Legionary: Warning after 1 Levy
    if (rankTitle === 'Legionary' && levy === 1) {
      return inSafetyNet 
        ? '⚔️ Commander: Legionary, one Levy failure stains your record. One more = <span style="color:#e74c3c">lose all your gained Legionary merits!</span>'
        : '⚔️ Commander: Legionary, one Levy failure stains your record. One more = <span style="color:#e74c3c">stripped to Recruit!</span>';
    }
    
    // Optio: Warning after 1 Levy OR 1 Hastatus
    if (rankTitle === 'Optio' && (levy === 1 || hastatus === 1)) {
      return inSafetyNet
        ? '⚔️ Commander: Optio, one weak battle marks your failure. One more Levy or Hastatus = <span style="color:#e74c3c">lose all your gained Optio merits!</span>'
        : '⚔️ Commander: Optio, one weak battle marks your failure. One more Levy or Hastatus = <span style="color:#e74c3c">broken to Legionary!</span>';
    }
    
    // Centurion: Need at least 1 Triarius/Imperator in last 5
    if (rankTitle === 'Centurion') {
      if (battlesPlayed >= 4 && eliteCount === 0) {
        return inSafetyNet
          ? '⚔️ Commander: Centurion, you have shown no excellence! Score Triarius or Imperator in the last battle or <span style="color:#e74c3c">lose all your gained Centurion merits!</span>'
          : '⚔️ Commander: Centurion, you have shown no excellence! Score Triarius or Imperator in the last battle or be <span style="color:#e74c3c">demoted to Optio!</span>';
      }
    }
    
    // Tribunus: Need at least 3 Triarius/Imperator in last 5
    if (rankTitle === 'Tribunus') {
      const neededElite = 3 - eliteCount;
      
      // Progressive warnings based on how many battles played
      if (neededElite > 0) {
        // After 1 battle with no elite
        if (battlesPlayed === 1 && eliteCount === 0) {
          return inSafetyNet
            ? '⚔️ Commander: Tribunus, you need <span style="color:#e74c3c">3 Triarius or Imperator</span> in your next 4 battles or lose all your gained Tribunus merits!'
            : '⚔️ Commander: Tribunus, you need <span style="color:#e74c3c">3 Triarius or Imperator</span> in your next 4 battles or face demotion to Centurion!';
        }
        
        // After 2 battles - check if still achievable
        if (battlesPlayed === 2) {
          if (neededElite === 3) {
            // Need all 3 remaining (still possible but tight)
            return inSafetyNet
              ? '⚔️ Commander: Tribunus, you need <span style="color:#e74c3c">Triarius or Imperator in ALL remaining battles</span> or lose all your gained Tribunus merits!'
              : '⚔️ Commander: Tribunus, you need <span style="color:#e74c3c">Triarius or Imperator in ALL remaining battles</span> or face demotion to Centurion!';
          } else if (neededElite === 2) {
            return inSafetyNet
              ? '⚔️ Commander: Tribunus, you need <span style="color:#e74c3c">2 more Triarius or Imperator</span> in 3 battles or lose all your gained Tribunus merits!'
              : '⚔️ Commander: Tribunus, you need <span style="color:#e74c3c">2 more Triarius or Imperator</span> in 3 battles or face demotion to Centurion!';
          }
        }
        
        // After 3 battles
        if (battlesPlayed === 3) {
          if (neededElite === 2) {
            // Need both remaining (still possible)
            return inSafetyNet
              ? '⚔️ Commander: Tribunus, you need <span style="color:#e74c3c">Triarius or Imperator in BOTH remaining battles</span> or lose all your gained Tribunus merits!'
              : '⚔️ Commander: Tribunus, you need <span style="color:#e74c3c">Triarius or Imperator in BOTH remaining battles</span> or face demotion to Centurion!';
          } else if (neededElite === 1) {
            return inSafetyNet
              ? '⚔️ Commander: Tribunus, you need <span style="color:#e74c3c">1 more Triarius or Imperator</span> in 2 battles or lose all your gained Tribunus merits!'
              : '⚔️ Commander: Tribunus, you need <span style="color:#e74c3c">1 more Triarius or Imperator</span> in 2 battles or face demotion to Centurion!';
          }
        }
        
        // After 4 battles - final warning (only if still achievable)
        if (battlesPlayed === 4) {
          if (neededElite === 1) {
            // Need exactly 1 more (still possible)
            return inSafetyNet
              ? '⚔️ Commander: Tribunus, you need <span style="color:#e74c3c">Triarius or Imperator</span> in the last battle or lose all your gained Tribunus merits!'
              : '⚔️ Commander: Tribunus, you need <span style="color:#e74c3c">Triarius or Imperator</span> in the last battle or face demotion to Centurion!';
          }
          // Don't show warning for neededElite >= 2 (impossible - immediate demotion)
        }
      }
    }
    
    return null;
  }
  
  // Check if demotion should occur (with safety net)
  // FIX: Include newBattleRank in levy/hastatus counts for Legionary and Optio
  // so demotion fires immediately on the triggering battle (not 1 battle late).
  // Centurion/Tribunus already check newBattleRank directly — no change needed there.
  static checkDemotion(rankTitle, recentRanks, newBattleRank, currentMerit = 0) {
    if (rankTitle === 'Recruit') return null;

    // ── FIX: merge current battle into counts for Legionary/Optio checks ──
    const allRanks = [...recentRanks, newBattleRank];
    const levy     = allRanks.filter(r => r === 'Levy').length;
    const hastatus = allRanks.filter(r => r === 'Hastatus').length;

    // Keep original recentRanks for Centurion/Tribunus elite tracking
    // (those ranks check newBattleRank directly, so no change needed there)
    const triarius  = recentRanks.filter(r => r === 'Triarius').length;
    const imperator = recentRanks.filter(r => r === 'Imperator').length;
    const eliteCount = triarius + imperator;
    
    // Check if player is in safety net zone
    const safetyThreshold = this.getSafetyNetThreshold(rankTitle);
    const inSafetyNet = safetyThreshold && currentMerit >= safetyThreshold;
    
    // Legionary: 2 Levy → Recruit or reset
    // (now counts current battle — fires immediately on 2nd Levy)
    if (rankTitle === 'Legionary' && levy >= 2) {
      if (inSafetyNet) {
        return {
          demote: true,
          newRank: 'Legionary',
          newMerit: 200,
          message: '⚔️ Commander: Two Levy failures! Your merit has been reset to 200! Prove yourself again!'
        };
      } else {
        return {
          demote: true,
          newRank: 'Recruit',
          newMerit: 0,
          message: '⚔️ Commander: Two Levy failures! You are stripped to Recruit! Prove your worth again!'
        };
      }
    }
    
    // Optio: 2 Levy OR 2 Hastatus OR (1 Levy + 1 Hastatus) → Legionary or reset
    // (now counts current battle — fires immediately on the triggering battle)
    if (rankTitle === 'Optio' && (levy >= 2 || hastatus >= 2 || (levy >= 1 && hastatus >= 1))) {
      if (inSafetyNet) {
        return {
          demote: true,
          newRank: 'Optio',
          newMerit: 500,
          message: '⚔️ Commander: Repeated weak battles! Your merit has been reset to 500! Rise or perish!'
        };
      } else {
        return {
          demote: true,
          newRank: 'Legionary',
          newMerit: 200,
          message: '⚔️ Commander: Repeated weak battles! You are broken to Legionary! Rise or perish!'
        };
      }
    }
    
    // Centurion: ANY Levy or Hastatus → immediate demotion or reset
    if (rankTitle === 'Centurion' && (newBattleRank === 'Levy' || newBattleRank === 'Hastatus')) {
      if (inSafetyNet) {
        return {
          demote: true,
          newRank: 'Centurion',
          newMerit: 900,
          message: '⚔️ Commander: A Centurion showing such weakness! Your merit has been reset to 900! Disgraceful!'
        };
      } else {
        return {
          demote: true,
          newRank: 'Optio',
          newMerit: 500,
          message: '⚔️ Commander: A Centurion showing such weakness! You are demoted to Optio! Disgraceful!'
        };
      }
    }
    
    // Centurion: No Triarius/Imperator after 5 battles → demotion or reset
    if (rankTitle === 'Centurion' && recentRanks.length >= 5 && eliteCount === 0) {
      if (inSafetyNet) {
        return {
          demote: true,
          newRank: 'Centurion',
          newMerit: 900,
          message: '⚔️ Commander: Five battles without excellence! Your merit has been reset to 900! Unacceptable!'
        };
      } else {
        return {
          demote: true,
          newRank: 'Optio',
          newMerit: 500,
          message: '⚔️ Commander: Five battles without excellence! You are demoted to Optio! Unacceptable!'
        };
      }
    }
    
    // Tribunus: ANY Levy or Hastatus → immediate demotion or reset
    if (rankTitle === 'Tribunus' && (newBattleRank === 'Levy' || newBattleRank === 'Hastatus')) {
      if (inSafetyNet) {
        return {
          demote: true,
          newRank: 'Tribunus',
          newMerit: 1300,
          message: '⚔️ Commander: A Tribunus falling to such depths! Your merit has been reset to 1300! Shameful!'
        };
      } else {
        return {
          demote: true,
          newRank: 'Centurion',
          newMerit: 900,
          message: '⚔️ Commander: A Tribunus falling to such depths! You are stripped to Centurion! Shameful!'
        };
      }
    }
    
    // Tribunus: Mathematical impossibility - can't get 3 elite in remaining battles
    // OR need ALL remaining battles to be elite (unrealistic)
    if (rankTitle === 'Tribunus') {
      const battlesLeft = 5 - recentRanks.length;
      const neededElite = 3 - eliteCount;
      
      if (neededElite >= battlesLeft) {
        if (inSafetyNet) {
          return {
            demote: true,
            newRank: 'Tribunus',
            newMerit: 1300,
            message: '⚔️ Commander: You cannot achieve the required excellence! Your merit has been reset to 1300!'
          };
        } else {
          return {
            demote: true,
            newRank: 'Centurion',
            newMerit: 900,
            message: '⚔️ Commander: You cannot achieve the required excellence! You are demoted to Centurion!'
          };
        }
      }
    }
    
    return null;
  }
  
  // Check if promotion requirements are met
  static canPromote(currentRank, merit, recentRanks) {
    const thresholds = [0, 200, 500, 900, 1300, 1750];
    const rankOrder = ['Recruit', 'Legionary', 'Optio', 'Centurion', 'Tribunus', 'Legatus'];
    const currentLevel = rankOrder.indexOf(currentRank);
    
    if (currentLevel >= 5) return true; // Already at max
    
    const nextLevel = currentLevel + 1;
    const nextRank = rankOrder[nextLevel];
    const nextThreshold = thresholds[nextLevel];
    
    // Check if merit threshold is met
    if (merit < nextThreshold) return false;
    
    // Centurion promotion: Need at least 1 Triarius/Imperator
    if (nextRank === 'Tribunus') {
      const triarius = recentRanks.filter(r => r === 'Triarius').length;
      const imperator = recentRanks.filter(r => r === 'Imperator').length;
      if ((triarius + imperator) < 1) return false;
    }
    
    // Tribunus promotion: Need at least 3 Triarius/Imperator
    if (nextRank === 'Legatus') {
      const triarius = recentRanks.filter(r => r === 'Triarius').length;
      const imperator = recentRanks.filter(r => r === 'Imperator').length;
      if ((triarius + imperator) < 3) return false;
    }
    
    return true;
  }
}

export { Scoring };
export default Scoring;
