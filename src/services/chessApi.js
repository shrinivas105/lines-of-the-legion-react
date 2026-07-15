// services/chessApi.js - Chess API service (converted from chess-api.js)
import { authHeader } from './lichessAuth';

export const pieces = {
  wp: "https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg",
  wr: "https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg",
  wn: "https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg",
  wb: "https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg",
  wq: "https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg",
  wk: "https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg",
  bp: "https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg",
  br: "https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg",
  bn: "https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg",
  bb: "https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg",
  bq: "https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg",
  bk: "https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg"
};

export class ChessAPI {
  static cache = {};
  // In-flight request tracking: if board info, quality scoring, and AI move
  // selection all ask for the same FEN before the first response lands, they
  // share this one promise instead of each firing a separate network request.
  static inflight = {};

  static _explorerHeaders() {
    const headers = {};
    const auth = authHeader();
    if (auth) headers['Authorization'] = auth;
    return headers;
  }

  static async queryExplorer(source, fen, moveCount = 5) {
    // The move count is part of the cache key: analysis normally needs only
    // the top five moves, but occasionally asks for a wider list to locate
    // the move that was actually played.
    const key = `${source}_${moveCount}_${fen}`;
    if (this.cache[key]) return this.cache[key];
    if (this.inflight[key]) return this.inflight[key];

    let url = source === 'master'
      ? 'https://explorer.lichess.ovh/masters'
      : 'https://explorer.lichess.ovh/lichess';
    url += `?variant=standard&fen=${encodeURIComponent(fen)}&topGames=0&moves=${moveCount}`;
    if (source === 'lichess') url += '&ratings=1600,1800,2000,2200,2500';

    const request = (async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: this._explorerHeaders(),
        });
        clearTimeout(timeout);

        if (response.status === 401 || response.status === 403) {
          console.warn('Explorer: auth required. Please connect your Lichess account.');
          return { white: 0, draws: 0, black: 0, moves: [], needsAuth: true };
        }

        if (!response.ok) throw new Error(`API error ${response.status}`);

        const data = await response.json();
        this.cache[key] = data;
        return data;
      } catch (e) {
        console.warn('Explorer failed:', e);
        return { white: 0, draws: 0, black: 0, moves: [], apiError: true };
      } finally {
        // Always release the in-flight slot, including on failure/auth-needed,
        // so a later retry issues a fresh request instead of reusing a
        // settled-but-uncached promise forever.
        delete this.inflight[key];
      }
    })();

    this.inflight[key] = request;
    return request;
  }

  static async queryGames(source, fen) {
    const base = source === 'master' ? 'masters' : 'lichess';
    let url = `https://explorer.lichess.ovh/${base}?variant=standard&fen=${encodeURIComponent(fen)}`;
    if (source === 'master') url += '&topGames=4';
    else url += '&recentGames=4&ratings=1600,1800,2000,2200,2500';

    try {
      const response = await fetch(url, { headers: this._explorerHeaders() });
      if (response.status === 401 || response.status === 403) {
        return { topGames: [], recentGames: [], needsAuth: true };
      }
      if (!response.ok) return { topGames: [], recentGames: [] };
      const data = await response.json();
      return { topGames: data.topGames || [], recentGames: data.recentGames || [] };
    } catch (e) {
      console.warn('Games query failed:', e);
      return { topGames: [], recentGames: [] };
    }
  }

  static async getEvaluation(fen, cache = {}) {
    if (cache[fen] !== undefined) return cache[fen];
    try {
      const response = await fetch('https://chess-api.com/v1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen })
      });
      if (response.ok) {
        const data = await response.json();
        if (typeof data.eval === 'number') {
          cache[fen] = data.eval;
          return data.eval;
        }
      }
    } catch (e) {
      console.log('Evaluation unavailable');
    }
    return 0;
  }
}

export default ChessAPI;
