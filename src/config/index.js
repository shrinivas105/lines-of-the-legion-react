// config.js - Scoring Configuration
// Easy-to-modify constants for testing optimal weightages

// ========================================
// QUALITY TRACKING SETTINGS
// ========================================
export const SKIP_QUALITY_MOVES = 4;  // Skip quality check for first N player moves (opening book moves)

// ========================================
// PRACTICE MODE CONFIGURATION
// Practice Mode always uses the Club (Lichess) explorer database.
// This single constant controls the practice source and thin-theory threshold.
export const PRACTICE_MODE = {
  source: 'lichess',
  minGames: 20
};

// ========================================
// ACCURACY BONUS THRESHOLDS
// Hidden bonus for maintaining high quality over longer battles.
// Only awarded when final eval >= +0.5
// Master campaign skips this entirely (see scoring.js).
// ========================================
export const ACCURACY_BONUS = {
  minQuality: 90,      // Minimum quality percentage required (90%)
  minEval: 0.5,        // Minimum evaluation required (+0.5 or better)
  tiers: [
    { minMoves: 12, maxMoves: 15, bonus: 2, name: 'Tactical Precision' },
    { minMoves: 16, maxMoves: 20, bonus: 4, name: 'Strategic Mastery' },
    { minMoves: 21, maxMoves: Infinity, bonus: 6, name: 'Legendary Discipline' }
  ]
};

// ========================================
// MASTER CAMPAIGN WEIGHTS
// ========================================
// Game ends the moment the position leaves the opening book.
//
//   depth   (60%) → GATES the rank band. Primary rank driver.
//   eval    (30%) → PRIMARY fine-tuner. Zoned (see MASTER_THEORY_DEPTH).
//                   Can cross into an adjacent band on a winning line.
//   quality (10%) → SECONDARY fine-tuner. Players usually hit high
//                   quality in theory so this is not a differentiator.
export const MASTER_WEIGHTS = {
  depth: 0.60,        // 60% — theory depth (gates the rank band)
  evaluation: 0.30,   // 30% — eval fine-tuner (zoned, can cross one band border)
  quality: 0.10       // 10% — quality fine-tuner (stays within band)
};

// ========================================
// MASTER CAMPAIGN - THEORY DEPTH SCORING
// ========================================
// Depth picks a BASE SCORE at the midpoint of each rank band.
// Eval and quality then adjust around that base using the
// zone logic defined below.
//
//   Rank          Score Range    Base Score   Theory Depth
//   ────────────────────────────────────────────────────────
//   Imperator     85 – 100       92.5         > 20 moves
//   Triarius      70 – 84        77           > 15 moves
//   Principes     55 – 69        62           > 10 moves
//   Hastatus      40 – 54        47           >  5 moves
//   Levy           0 – 39        19.5         ≤  5 moves
//
export const MASTER_THEORY_DEPTH = {
  tiers: [
    { minMoves: 21, baseScore: 92.5, name: 'Imperator' },
    { minMoves: 16, baseScore: 77,   name: 'Triarius' },
    { minMoves: 11, baseScore: 62,   name: 'Principes' },
    { minMoves: 6,  baseScore: 47,   name: 'Hastatus' },
    { minMoves: 0,  baseScore: 19.5, name: 'Levy' }
  ],

  // --- Eval zones (piecewise, symmetric around 0) ---
  //
  // Eval is NOT linearly normalized. It is mapped through three zones:
  //
  //   Zone         Eval Range       Meaning              evalAdj
  //   ──────────── ──────────────── ──────────────────── ──────────────────
  //   Winning-     < -1.5           Losing badly         -7.5 → -15
  //   Good-        -1.5 to -0.5     Slight disadvantage  -7.5 →  0
  //   Equal        -0.5 to +0.5     Position is equal     0  (flat, no effect)
  //   Good+        +0.5 to +1.5     Good advantage        0  → +7.5
  //   Winning+     > +1.5           Winning advantage    +7.5 → +15
  //   ──────────── ──────────────── ──────────────────── ──────────────────
  //
  // Why piecewise and not linear:
  //   -0.5 to +0.5 is engine noise in the opening. Punishing or rewarding
  //   it would be arbitrary. The Equal zone is a flat dead zone — no effect.
  //   Good zone ramps steeply (7.5 pts per 1.0 eval) because the jump from
  //   equal to good IS meaningful. Winning zone ramps slower (7.5 pts per
  //   1.5 eval) — diminishing returns once you're already winning.
  //
  // Piecewise formula (see scoring.js for implementation):
  //   eval < -1.5           → evalAdj = -7.5 + ((eval + 1.5) / 1.5) × 7.5   clamp min -15
  //   -1.5 ≤ eval < -0.5   → evalAdj = ((eval + 0.5) / 1.0) × 7.5          scales -7.5 to 0
  //   -0.5 ≤ eval ≤ +0.5   → evalAdj = 0                                     dead zone
  //   +0.5 < eval ≤ +1.5   → evalAdj = ((eval - 0.5) / 1.0) × 7.5          scales 0 to +7.5
  //   eval > +1.5           → evalAdj = 7.5 + ((eval - 1.5) / 1.5) × 7.5    clamp max +15
  //
  eval: {
    equalMin: -0.5,       // Lower bound of equal zone
    equalMax: 0.5,        // Upper bound of equal zone
    goodMax: 1.5,         // Good zone ends / Winning zone starts
    winningCap: 3.0,      // Eval values beyond this are clamped
    goodSwing: 7.5,       // Max adjustment at end of Good zone (±7.5)
    winningSwing: 15      // Max adjustment at Winning cap (±15 = 1 full band width)
  },

  // --- Quality adjustment ---
  // Quality (0–100) maps to a ± swing within the band only.
  //   qualAdj = (quality - 50) / 50 × qualitySwingMax
  //
  //   quality   0  → -3.75
  //   quality  50  →  0
  //   quality 100  → +3.75
  //
  qualitySwingMax: 3.75
};

// ========================================
// CLUB CAMPAIGN WEIGHTS
// ========================================
export const CLUB_WEIGHTS = {
 moves: 0.25,          // 25% - Survival
  quality: 0.375,        // 37.5% - Book Quality
  evaluation: 0.375,     // 37.5% - Evaluation
  movesMultiplier: 4, // Points per move (moves × 4)
  evalMultiplier: 12  // Evaluation scaling ((eval + 3) × 12)
};

// ========================================
// MASTER CAMPAIGN - PENALTY MULTIPLIERS
// ========================================
// Not applicable — game ends at theory exit, eval never diverges.
// Kept as no-op for structure consistency.
export const MASTER_PENALTY_MULTIPLIERS = {
  acceptable: 1.0
};

// ========================================
// CLUB CAMPAIGN - PENALTY MULTIPLIERS
// Applied to total score based on final position
// ========================================
export const CLUB_PENALTY_MULTIPLIERS = {
  catastrophic: 0.4,  // eval ≤ -3 (60% penalty, max 40 points) - more forgiving
  poor: 0.85,         // -3 < eval < -1.5 (15% penalty, max 65 points) - more forgiving
  acceptable: 1.0     // eval ≥ -1.5 (no penalty, max 100 points)
};

// ========================================
// MASTER CAMPAIGN - EVALUATION THRESHOLDS
// ========================================
// Not applicable — game ends at theory exit.
// Kept as no-op for structure consistency.
export const MASTER_EVAL_THRESHOLDS = {};

// ========================================
// CLUB CAMPAIGN - EVALUATION THRESHOLDS
// Used to determine penalty multipliers
// ========================================
export const CLUB_EVAL_THRESHOLDS = {
  catastrophic: -3.5, // Total rout - more lenient (harder to trigger)
  poor: -2.0          // Broken lines - more lenient
};

// ========================================
// BATTLE RANK THRESHOLDS (Same for both campaigns)
// Score ranges for each battle rank
// ========================================
export const BATTLE_RANK_THRESHOLDS = {
  imperator: 85,   // 85-100
  triarius: 70,    // 70-84
  principes: 55,   // 55-69
  hastatus: 40,    // 40-54
  levy: 0          // 0-39
};

// ========================================
// SHORT SKIRMISH PENALTY
// Applied as a final post-processing step, after the normal battle score
// (both campaigns) has already been fully calculated. Prevents inflated
// merit from battles that end before the legion has shown any real
// opening discipline.
//
//   theoryMoves < SHORT_SKIRMISH_THRESHOLD → finalMerit *= SHORT_SKIRMISH_MULTIPLIER
// ========================================
export const SHORT_SKIRMISH_THRESHOLD = 5;    // fewer than this many theory moves triggers the penalty
export const SHORT_SKIRMISH_MULTIPLIER = 0.60; // 40% merit reduction

// ========================================
// MASTER CAMPAIGN - TRICKY MOVE CONFIGURATION
// Rewards finding strong moves ranked 5-20 with positive win advantages
// ========================================
export const MASTER_TRICKY_MOVE = {
  enabled: true,
  minRank: 5,          // Start checking from 5th best move
  maxRank: 20,         // Check up to 20th best move
  tiers: [
    {
      minGames: 5000,           // High-frequency positions
      maxGames: Infinity,
      minWinAdvantage: 10       // Requires +10% win advantage
    },
    {
      minGames: 1000,           // Medium-frequency positions
      maxGames: 4999,
      minWinAdvantage: 20       // Requires +20% win advantage
    },
    {
      minGames: 1,              // Low-frequency positions
      maxGames: 999,
      minWinAdvantage: 30       // Requires +30% win advantage
    }
  ]
};

// ========================================
// CLUB CAMPAIGN - TRICKY MOVE CONFIGURATION
// More lenient than Master - easier to qualify tricky moves
// ========================================
export const CLUB_TRICKY_MOVE = {
  enabled: true,
  minRank: 5,          // Start checking from 5th best move
  maxRank: 20,         // Check up to 20th best move
  tiers: [
    {
      minGames: 5000,           // High-frequency positions
      maxGames: Infinity,
      minWinAdvantage: 8        // Requires +8% win advantage (easier)
    },
    {
      minGames: 1000,           // Medium-frequency positions
      maxGames: 4999,
      minWinAdvantage: 15       // Requires +15% win advantage (easier)
    },
    {
      minGames: 1,              // Low-frequency positions
      maxGames: 999,
      minWinAdvantage: 25       // Requires +25% win advantage (easier)
    }
  ]
};
