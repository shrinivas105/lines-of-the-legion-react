// services/practiceOpeningsStore.js — user-managed practice openings layered
// on top of the bundled PracticeOpenings list (config/practiceOpenings.js).
// Ports the legacy PracticeOpeningsManager (practice-openings.js) behavior:
// user-added/imported rows and deleted built-in rows both persist in
// localStorage under the same keys, so nothing is lost switching between
// the old and new app. CSV import/export use name/fen/orientation/category
// columns (category is new here since the bundled list already has one).

import { PracticeOpenings as BASE_OPENINGS } from '../config/practiceOpenings';

const USER_ROWS_KEY = 'practiceOpeningsUserLines';
const DELETED_BASE_KEY = 'practiceOpeningsDeletedBaseRows';
const DEFAULT_CATEGORY = 'My Openings';

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
  const user = getUserRows().map((row, index) => ({ ...row, source: 'user', originalIndex: index }));
  return [...base, ...user];
}

export function addOpening({ name, fen, orientation, category }) {
  const row = {
    name: formatName(name),
    fen: String(fen || '').trim(),
    orientation: String(orientation || '').trim().toLowerCase() === 'black' ? 'black' : 'white',
    category: String(category || '').trim() || DEFAULT_CATEGORY,
  };
  if (!row.name || !row.fen) {
    return { ok: false, error: 'Name and FEN are both required.' };
  }
  const rows = getUserRows();
  rows.push(row);
  saveJSON(USER_ROWS_KEY, rows);
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
    rows.splice(originalIndex, 1);
    saveJSON(USER_ROWS_KEY, rows);
  }
}

// Undoes any built-in openings the player has removed — a separate, explicit
// action rather than something upload/download touch.
export function restoreDeletedBaseOpenings() {
  saveJSON(DELETED_BASE_KEY, []);
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
    const category = String(row.category || '').trim() || DEFAULT_CATEGORY;
    if (!name || !fen) return null;
    return { name, fen, orientation, category };
  }).filter(Boolean);
}

function stringifyCsv(rows) {
  const header = ['name', 'fen', 'orientation', 'category'];
  const escape = value => `"${String(value || '').replace(/"/g, '""')}"`;
  const lines = rows.map(row => header.map(key => escape(row[key] ?? '')).join(','));
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

// Uploading REPLACES the player's own added rows (mirrors legacy behavior)
// — it does not touch the bundled list, so removed built-ins stay removed
// and "restore" remains a separate, explicit action.
export async function uploadCsv(file) {
  const text = await file.text();
  const rows = parseCsv(text);
  if (!rows.length) {
    return { ok: false, error: 'No valid rows found. Each row needs at least a name and a FEN.' };
  }
  saveJSON(USER_ROWS_KEY, rows);
  return { ok: true, count: rows.length };
}
