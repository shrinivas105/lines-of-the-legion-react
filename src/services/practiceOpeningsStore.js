// services/practiceOpeningsStore.js — user-managed practice openings layered
// on top of the bundled PracticeOpenings list (config/practiceOpenings.js).
// Ports the legacy PracticeOpeningsManager (practice-openings.js) behavior:
// user-added/imported rows and deleted built-in rows both persist in
// localStorage under the same keys, so nothing is lost switching between
// the old and new app. CSV import/export use name/fen/orientation/mode/
// category columns.
//
// CLOUD SYNC: when logged in (see logic/authModule.js), every user row also
// syncs to the practice_openings Supabase table (see
// supabase/migrations/20260716_practice_openings.sql). localStorage stays
// the source of truth for synchronous reads — the UI never awaits a
// network call just to render the list — and cloud writes happen
// fire-and-forget in the background, same pattern the app already uses for
// player_progress. Each locally-added row gets a `clientId` (independent of
// the eventual cloud `id`) so an in-flight add/remove can still be matched
// up correctly once its network call resolves, even if the array has
// changed shape in the meantime.
//
// `mode` ('master' | 'club') records which explorer this opening's
// move-quality evaluation should use during practice, replacing the old
// hardcoded PRACTICE_MODE.source — see logic/chessTheoryApp.js
// startPracticeOpening().

import { PracticeOpenings as BASE_OPENINGS } from '../config/practiceOpenings';
import { fetchPracticeOpenings, insertPracticeOpening, deletePracticeOpening } from './supabaseClient';

const USER_ROWS_KEY = 'practiceOpeningsUserLines';
const DELETED_BASE_KEY = 'practiceOpeningsDeletedBaseRows';
const DEFAULT_CATEGORY = 'My Openings';
export const MAX_OPENINGS = 20;

function makeClientId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable — silently ignore, matches legacy behavior
  }
}

function formatName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => (word ? word[0].toUpperCase() + word.slice(1) : ''))
    .join(' ');
}

function normalizeMode(mode) {
  return String(mode || '').trim().toLowerCase() === 'master' ? 'master' : 'club';
}

function getUserRows() {
  return loadJSON(USER_ROWS_KEY, []);
}

function getDeletedBaseIndexes() {
  return loadJSON(DELETED_BASE_KEY, []);
}

// The merged, currently-effective list: bundled openings (minus any the
// player removed) followed by the player's own additions/imports. Each row
// carries `source` ('base' | 'user') and `originalIndex` so removeOpening()
// can find it again.
export function getEffectiveOpenings() {
  const deleted = getDeletedBaseIndexes();
  const base = BASE_OPENINGS
    .map((row, index) => ({ ...row, source: 'base', originalIndex: index }))
    .filter(row => !deleted.includes(row.originalIndex));
  const user = getUserRows().map((row, index) => ({ ...row, source: row.source || 'user', originalIndex: index }));
  return [...base, ...user];
}

export function getUserOpeningsCount() {
  return getUserRows().length;
}

function normalizeMoveNumber(moveNumber) {
  const n = Math.floor(Number(moveNumber));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// Same non-negative-integer clamp as moveNumber, reused for the two
// captured quality-tracking counters (topMoveChoices/qualityTrackedMoves).
// Unlike moveNumber these can legitimately be 0 even for a genuine capture
// (e.g. captured right at move 1, before SKIP_QUALITY_MOVES even kicks in
// isn't possible — but a 0/0 capture is still valid data, not "missing"),
// so this only guards against NaN/negative garbage, not zero itself.
function normalizeQualityStat(value) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

// `source` here distinguishes how the row was created for display/analytics
// purposes ('user' = manual entry or CSV import, 'captured' = the Analysis
// screen's "Add to Practice" button) — both count identically toward the
// 20-cap and both sync to the cloud the same way.
export function addOpening({ name, fen, orientation, mode, category, source, moveNumber, topMoveChoices, qualityTrackedMoves }) {
  const row = {
    clientId: makeClientId(),
    name: formatName(name),
    fen: String(fen || '').trim(),
    orientation: String(orientation || '').trim().toLowerCase() === 'black' ? 'black' : 'white',
    mode: normalizeMode(mode),
    category: String(category || '').trim() || DEFAULT_CATEGORY,
    source: source === 'captured' ? 'captured' : 'user',
    // Implicit — never shown/edited in any UI form. Only ever set by
    // ChessTheoryApp.addAnalysisPositionToPractice (captured rows); manual
    // entries, CSV imports, and bundled base openings default to 0 (i.e.
    // "starts from move one" with a clean quality slate). See scoring.js /
    // chessTheoryApp.js startPracticeOpening for how these feed the
    // scoring assessment.
    moveNumber: normalizeMoveNumber(moveNumber),
    topMoveChoices: normalizeQualityStat(topMoveChoices),
    qualityTrackedMoves: normalizeQualityStat(qualityTrackedMoves),
  };
  if (!row.name || !row.fen) {
    return { ok: false, error: 'Name and FEN are both required.' };
  }
  const rows = getUserRows();
  if (rows.length >= MAX_OPENINGS) {
    return { ok: false, error: `You've reached the ${MAX_OPENINGS}-opening limit. Remove one before adding another.` };
  }
  rows.push(row);
  saveJSON(USER_ROWS_KEY, rows);
  syncRowToCloud(row.clientId);
  return { ok: true };
}

export function removeOpening(source, originalIndex) {
  if (source === 'base') {
    const deleted = getDeletedBaseIndexes();
    if (!deleted.includes(originalIndex)) {
      deleted.push(originalIndex);
      saveJSON(DELETED_BASE_KEY, deleted);
    }
    return;
  }
  const rows = getUserRows();
  if (originalIndex >= 0 && originalIndex < rows.length) {
    const [removed] = rows.splice(originalIndex, 1);
    saveJSON(USER_ROWS_KEY, rows);
    if (removed?.id) {
      deletePracticeOpening(removed.id);
    } else if (removed?.clientId) {
      // A cloud insert may still be in flight for this row — flag it so
      // syncRowToCloud() deletes it from the cloud the moment that insert
      // resolves, instead of leaving an orphaned row the user never sees.
      pendingRemovals.add(removed.clientId);
    }
  }
}

// Undoes any built-in openings the player has removed — a separate, explicit
// action rather than something upload/download touch.
export function restoreDeletedBaseOpenings() {
  saveJSON(DELETED_BASE_KEY, []);
}

// --- Cloud sync -------------------------------------------------------------

const pendingRemovals = new Set();

// Fire-and-forget: pushes one newly-added local row to the cloud and patches
// its cloud `id` back into localStorage once the insert resolves. Matched by
// `clientId`, not array position, so this stays correct even if other rows
// were added/removed while the network call was in flight.
async function syncRowToCloud(clientId) {
  const rows = getUserRows();
  const row = rows.find(r => r.clientId === clientId);
  if (!row) return; // already removed locally before the insert even started

  const result = await insertPracticeOpening(row);

  if (pendingRemovals.has(clientId)) {
    pendingRemovals.delete(clientId);
    if (result.success) deletePracticeOpening(result.data.id);
    return;
  }
  if (!result.success) {
    if (result.error === 'cap') {
      // Cloud thinks we're already at 20 (e.g. added from another device
      // since this session started) — leave the row local-only rather than
      // losing it; it'll sync next time something frees up a slot.
    }
    return;
  }

  const current = getUserRows();
  const idx = current.findIndex(r => r.clientId === clientId);
  if (idx !== -1) {
    current[idx] = { ...current[idx], id: result.data.id };
    saveJSON(USER_ROWS_KEY, current);
  }
}

function fromCloudRow(row) {
  return {
    clientId: row.id,
    id: row.id,
    name: row.name,
    fen: row.fen,
    orientation: row.orientation,
    mode: normalizeMode(row.mode),
    category: row.category || DEFAULT_CATEGORY,
    source: row.source === 'captured' ? 'captured' : 'user',
    // move_number/top_move_choices/quality_tracked_moves are nullable
    // columns so pre-existing cloud rows (synced before these fields
    // existed) still map cleanly to 0.
    moveNumber: normalizeMoveNumber(row.move_number),
    topMoveChoices: normalizeQualityStat(row.top_move_choices),
    qualityTrackedMoves: normalizeQualityStat(row.quality_tracked_moves),
  };
}

// Called once after sign-in (see authModule.js). Reconciles local and cloud
// state: cloud rows become canonical, any purely-local rows (added before
// login, or added while offline) get pushed up to the cloud respecting the
// 20-cap, and anything that doesn't fit stays local-only for next time.
// No-ops entirely (leaves local storage untouched) if the fetch fails or the
// caller isn't actually logged in, so logged-out play is never affected.
// Defense-in-depth: if this ever gets called twice concurrently (e.g. two
// overlapping SIGNED_IN events), a second call would read the same
// not-yet-synced "local-only" rows the first call is still inserting and
// push each of them to the cloud a second time. Callers should already be
// idempotent (see ChessTheoryApp.init()), but this guard makes the
// function itself safe to call concurrently regardless.
let syncInFlight = null;

export function syncPracticeOpeningsFromCloud() {
  if (syncInFlight) return syncInFlight;
  syncInFlight = doSyncPracticeOpeningsFromCloud().finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}

async function doSyncPracticeOpeningsFromCloud() {
  const cloudRows = await fetchPracticeOpenings();
  if (cloudRows === null) return;

  const local = getUserRows();
  const cloudIds = new Set(cloudRows.map(r => r.id));
  const localOnly = local.filter(r => !r.id);
  // Rows that had a cloud id but are no longer on the cloud (deleted from
  // another device/session) are dropped locally too — the cloud is
  // canonical once a row has synced at all.

  let cloudCount = cloudRows.length;
  const stillLocalOnly = [];
  const newlyInserted = [];
  for (const row of localOnly) {
    if (cloudCount >= MAX_OPENINGS) { stillLocalOnly.push(row); continue; }
    const result = await insertPracticeOpening(row);
    if (result.success) {
      newlyInserted.push(fromCloudRow(result.data));
      cloudCount += 1;
    } else {
      stillLocalOnly.push(row);
    }
  }

  const merged = [...cloudRows.map(fromCloudRow), ...newlyInserted, ...stillLocalOnly];
  saveJSON(USER_ROWS_KEY, merged);
  void cloudIds; // reserved for future conflict handling; unused for now
}

// --- CSV import/export ----------------------------------------------------

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let insideQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (insideQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') { current += '"'; i += 1; } else { insideQuotes = false; }
      } else {
        current += char;
      }
    } else if (char === '"') {
      insideQuotes = true;
    } else if (char === ',') {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function parseCsv(text) {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n').filter(line => line.trim().length > 0);
  if (!lines.length) return [];
  const header = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    const row = {};
    header.forEach((key, index) => { row[key] = values[index] ?? ''; });
    const name = formatName(row.name);
    const fen = String(row.fen || '').trim();
    let orientation = String(row.orientation || '').trim().toLowerCase();
    if (orientation !== 'black') orientation = 'white';
    // Old exports (from before this feature) won't have a mode column —
    // defaults to 'club', matching the app's previous hardcoded behavior
    // of always evaluating practice against the Club/Lichess explorer.
    const mode = normalizeMode(row.mode);
    const category = String(row.category || '').trim() || DEFAULT_CATEGORY;
    // Older exports won't have a movenumber/topmovechoices/qualitytrackedmoves
    // column either — all default to 0, same as any other manually-entered/
    // imported row (only rows captured via "Add to Practice" ever have
    // non-zero values to begin with).
    const moveNumber = normalizeMoveNumber(row.movenumber);
    const topMoveChoices = normalizeQualityStat(row.topmovechoices);
    const qualityTrackedMoves = normalizeQualityStat(row.qualitytrackedmoves);
    if (!name || !fen) return null;
    return {
      clientId: makeClientId(), name, fen, orientation, mode, category, source: 'user',
      moveNumber, topMoveChoices, qualityTrackedMoves,
    };
  }).filter(Boolean);
}

function stringifyCsv(rows) {
  const header = ['name', 'fen', 'orientation', 'mode', 'category', 'movenumber', 'topmovechoices', 'qualitytrackedmoves'];
  const fieldMap = { movenumber: 'moveNumber', topmovechoices: 'topMoveChoices', qualitytrackedmoves: 'qualityTrackedMoves' };
  const escape = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map(row => header.map(key => escape(row[fieldMap[key] || key])).join(','));
  return [header.join(','), ...lines].join('\n');
}

export function downloadCsv(filename) {
  const rows = getEffectiveOpenings();
  const csv = stringifyCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `practice-openings-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Uploading REPLACES the player's own added rows (mirrors legacy behavior,
// and — same as before this feature — that includes rows captured from the
// Analysis screen, not just manually-typed/imported ones; it's one combined
// "your openings" list). It does not touch the bundled list, so removed
// built-ins stay removed and "restore" remains a separate, explicit action.
export async function uploadCsv(file) {
  const text = await file.text();
  const rows = parseCsv(text);
  if (!rows.length) {
    return { ok: false, error: 'No valid rows found. Each row needs at least a name and a FEN.' };
  }
  if (rows.length > MAX_OPENINGS) {
    return { ok: false, error: `That file has ${rows.length} rows, which is over the ${MAX_OPENINGS}-opening limit. Trim it down and try again.` };
  }
  const oldRows = getUserRows();
  saveJSON(USER_ROWS_KEY, rows);
  replaceCloudRows(oldRows, rows);
  return { ok: true, count: rows.length };
}

// Fire-and-forget: mirrors a wholesale CSV replace to the cloud by deleting
// every previously-synced row, then inserting the new set one at a time
// (the cap trigger would reject a true bulk insert past 20 anyway, and the
// upload-time length check above already keeps this under the limit).
async function replaceCloudRows(oldRows, newRows) {
  await Promise.all(oldRows.filter(r => r.id).map(r => deletePracticeOpening(r.id)));
  for (const row of newRows) {
    await syncRowToCloud(row.clientId);
  }
}
