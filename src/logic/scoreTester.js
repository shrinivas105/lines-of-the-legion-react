// logic/scoreTester.js — PGN Score Tester
//
// A testing utility (not part of the live game flow) that lets you upload
// an already-played PGN and see exactly how the campaign scoring engine
// would have scored it, without having to play a live battle move by move.
//
// It replays the PGN move by move and, for the side you say you played,
// runs the *same* analysis a live battle runs:
//   - Scoring.assessMoveQuality() for each of that side's moves (identical
//     top-3 / tricky-move logic to chessTheoryApp.checkMoveQuality)
//   - the same "thin theory" stopping rule chessTheoryApp.aiMove() uses,
//     so — just like a real battle — the analysis stops the moment the
//     opponent's explorer book runs dry, even if the uploaded PGN carries
//     on for many more moves after that point
//   - Scoring.finalizeGameScore() for the final score/rank, identical to
//     chessTheoryApp.stopGameDueToThinTheory()
//
// Because all three of those are the exact functions the live game calls
// (not copies), any tweak made to scoring.js is automatically reflected
// here too — this is the point of the tool: testing whether the scoring
// mechanism is behaving the way it should.
import { Chess } from 'chess.js';
import { ChessAPI } from '../services/chessApi';
import { Scoring } from './scoring';
import { SKIP_QUALITY_MOVES } from '../config';

// Campaign (non-practice) thin-theory thresholds — mirrors the ternary in
// chessTheoryApp.aiMove(): `this.aiSource === 'master' ? 5 : 20`.
function minGamesFor(aiSource) {
  return aiSource === 'master' ? 5 : 20;
}

function formatDisplayEval(playerEval) {
  return playerEval > 0 ? '+' + playerEval.toFixed(1) : playerEval.toFixed(1);
}

function moveNumberLabel(ply, color) {
  // ply is 1-based overall halfmove count. Standard PGN numbering.
  const fullMove = Math.ceil(ply / 2);
  return color === 'w' ? `${fullMove}.` : `${fullMove}...`;
}

/**
 * @param {Object} params
 * @param {string} params.pgn - Raw PGN text.
 * @param {'master'|'lichess'} params.aiSource - Which explorer database to score against.
 * @param {'w'|'b'} params.playerColor - Which side you played.
 * @param {(done:number, total:number) => void} [params.onProgress] - Optional progress callback.
 * @returns {Promise<Object>} result — see README-style comment below for shape.
 */
export async function analyzePgnBattle({ pgn, aiSource, playerColor, onProgress }) {
  if (!pgn || !pgn.trim()) {
    return { success: false, error: 'Paste or upload a PGN first.' };
  }

  // Parse into an ordered move list using a throwaway Chess instance —
  // chess.js validates legality as it replays the PGN, so a malformed or
  // illegal PGN surfaces here as a clear error rather than corrupting the
  // replay below.
  const parser = new Chess();
  let headers = {};
  try {
    parser.loadPgn(pgn, { strict: false });
    headers = typeof parser.getHeaders === 'function' ? parser.getHeaders() : {};
  } catch (e) {
    return { success: false, error: 'Could not parse this PGN — check that the move list is well-formed.' };
  }

  const verboseMoves = parser.history({ verbose: true });
  if (verboseMoves.length === 0) {
    return { success: false, error: 'This PGN has no moves to analyze.' };
  }

  // Replay onto a fresh board, honoring a custom starting FEN if the PGN
  // declared one (e.g. a line captured mid-opening), same as the game does
  // for practice openings.
  const replay = new Chess();
  if (headers.FEN) {
    try {
      replay.load(headers.FEN);
    } catch (e) {
      // Fall back to the standard start position if the FEN header is bad.
    }
  }

  let playerMoves = 0;
  let topMoveChoices = 0;
  let qualityTrackedMoves = 0;
  const moveLog = [];
  const evalCache = {};

  let stopReason = null;
  let stopPly = null;

  for (let i = 0; i < verboseMoves.length; i++) {
    const mv = verboseMoves[i];
    const ply = i + 1;
    if (onProgress) onProgress(ply, verboseMoves.length);

    const prevFEN = replay.fen();
    replay.move({ from: mv.from, to: mv.to, promotion: mv.promotion });
    const postFEN = replay.fen();

    const isPlayerMove = mv.color === playerColor;

    if (isPlayerMove) {
      playerMoves++;
      qualityTrackedMoves++;

      const moveUCI = mv.from + mv.to + (mv.promotion || '');
      let logEntry = { ply, moveNumber: moveNumberLabel(ply, mv.color), san: mv.san, isPlayerMove: true };

      if (playerMoves <= SKIP_QUALITY_MOVES) {
        topMoveChoices++;
        logEntry = { ...logEntry, note: 'opening book (auto-credited)', counted: true };
      } else {
        const data = await ChessAPI.queryExplorer(aiSource, prevFEN);
        if (!data.moves || data.moves.length === 0) {
          logEntry = { ...logEntry, note: 'no explorer data at this position', counted: false };
        } else {
          const result = Scoring.assessMoveQuality(data, moveUCI, playerColor, aiSource);
          if (result.moveIndex === -1) {
            logEntry = { ...logEntry, note: 'not found in explorer book', counted: false };
          } else if (result.counted) {
            topMoveChoices++;
            logEntry = { ...logEntry, note: `rank ${result.moveIndex + 1} (${result.reason})`, counted: true };
          } else {
            logEntry = { ...logEntry, note: `rank ${result.moveIndex + 1}, not a quality move`, counted: false };
          }
        }
      }
      moveLog.push(logEntry);

      // Same check chessTheoryApp.aiMove() runs right after a player move,
      // to decide whether the opponent still has book to reply with. If
      // not, this is exactly where a live battle would stop and score —
      // regardless of how many more moves the uploaded PGN actually plays.
      const thinCheckData = await ChessAPI.queryExplorer(aiSource, postFEN);
      const totalGames = (thinCheckData.white || 0) + (thinCheckData.draws || 0) + (thinCheckData.black || 0);
      const hasMoves = thinCheckData.moves && thinCheckData.moves.length > 0;
      if (totalGames < minGamesFor(aiSource) || !hasMoves) {
        stopReason = 'thin-theory';
        stopPly = ply;
        break;
      }
    } else {
      moveLog.push({ ply, moveNumber: moveNumberLabel(ply, mv.color), san: mv.san, isPlayerMove: false });

      // Mirrors aiMove(): if the opponent's own move ends the game outright
      // (checkmate, stalemate, etc.), that's also an immediate stop.
      if (replay.isGameOver()) {
        stopReason = 'game-over';
        stopPly = ply;
        break;
      }
    }
  }

  if (!stopReason) {
    stopReason = 'end-of-pgn';
    stopPly = verboseMoves.length;
  }

  if (playerMoves === 0) {
    return {
      success: false,
      error: `No moves were found for ${playerColor === 'w' ? 'White' : 'Black'} — double-check the orientation you selected.`,
    };
  }

  const finalFEN = replay.fen();
  const isCheckmate = replay.isCheckmate();
  const playerDeliveredCheckmate = isCheckmate && replay.turn() !== playerColor;

  const result = await Scoring.finalizeGameScore({
    fen: finalFEN,
    isCheckmate,
    playerDeliveredCheckmate,
    playerColor,
    playerMoves,
    topMoveChoices,
    qualityTrackedMoves,
    aiSource,
    evalCache,
  });

  if (result.error) {
    return { success: false, error: 'The evaluation API is unreachable right now — try again shortly.' };
  }

  return {
    success: true,
    stopReason,
    stopPly,
    totalPgnPlies: verboseMoves.length,
    stoppedAtMoveLabel: moveNumberLabel(stopPly, verboseMoves[stopPly - 1].color),
    playerMoves,
    topMoveChoices,
    qualityTrackedMoves,
    moveQuality: result.moveQuality,
    finalEval: result.finalPlayerEval,
    displayEval: formatDisplayEval(result.finalPlayerEval),
    score: result.score,
    penaltyReason: result.penaltyReason,
    battleRank: result.battleRank,
    moveLog,
    finalFEN,
  };
}

export default analyzePgnBattle;
