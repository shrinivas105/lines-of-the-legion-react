// services/supabaseClient.js - Supabase client and auth helpers
// Converted from supabase-client.js to ES module

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lvnmwycnrkltcechihai.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2bm13eWNucmtsdGNlY2hpaGFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MTMyOTgsImV4cCI6MjA4MjQ4OTI5OH0.8SuFBDcBaOFHFAnt3C4mero3Y38AnjshvAUL7a1ncwo';

function getURL() {
  let url = window.location.origin;
  url = url.endsWith('/') ? url : `${url}/`;
  return url;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'chess-theory-supabase-auth',
  }
});

// Expose a legacy-global for older scripts that expect `window.supabaseClient`
// (the tmp_archive/legacy code used this pattern). Assign synchronously so
// importing modules and non-module scripts can both access the same client.
if (typeof window !== 'undefined' && typeof window.supabaseClient === 'undefined') {
  try {
    window.supabaseClient = supabase;
  } catch (e) {
    // noop in non-browser environments
  }
}

// Clean stale OAuth params on load
const params = new URLSearchParams(window.location.search);
if (params.has('access_token') || params.has('refresh_token') || params.has('code')) {
  setTimeout(() => {
    window.history.replaceState({}, document.title, window.location.pathname);
  }, 100);
}

export async function getUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) { console.error('getUser error:', error); return null; }
    return user;
  } catch (e) {
    console.error('getUser exception:', e);
    return null;
  }
}

export async function signInWithGoogle() {
  try {
    const redirectUrl = getURL();
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('error')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        // Ask Supabase to return the provider URL instead of redirecting
        // directly, so we can perform a top-level redirect ourselves.
        skipBrowserRedirect: true,
        queryParams: { access_type: 'offline', prompt: 'select_account' }
      }
    });
    if (error) throw error;
    // If Supabase returned a redirect URL, navigate top-level to it.
    if (data && data.url) {
      try {
        (window.top || window).location.href = data.url;
      } catch (e) {
        window.location.href = data.url;
      }
    }
    return data;
  } catch (e) {
    console.error('signInWithGoogle error:', e);
    return null;
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('signOut error:', e);
    return false;
  }
}

export async function loadProgress() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('player_progress')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('loadProgress error:', error);
      return null;
    }
    return data;
  } catch (e) {
    console.error('loadProgress exception:', e);
    return null;
  }
}

export async function saveProgress(progress) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not logged in' };

    const { data, error } = await supabase
      .from('player_progress')
      .upsert({
        user_id: user.id,
        ...progress,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('saveProgress error:', error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (e) {
    console.error('saveProgress exception:', e);
    return { success: false, error: e };
  }
}

export default supabase;

// --- Practice openings (cloud sync) ----------------------------------------
// Mirrors the loadProgress/saveProgress pattern above: every call checks
// for a logged-in user itself rather than trusting a passed-in id, and
// fails soft (returns null/false) when logged out so callers can fall back
// to local-only storage without special-casing "not logged in" everywhere.

export async function fetchPracticeOpenings() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('practice_openings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('fetchPracticeOpenings error:', error);
      return null;
    }
    return data;
  } catch (e) {
    console.error('fetchPracticeOpenings exception:', e);
    return null;
  }
}

// Inserts one row for the current user. The 20-cap is enforced by a
// database trigger (see supabase/migrations) — this surfaces that
// rejection as a normal { success: false } result rather than throwing.
export async function insertPracticeOpening(row) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not logged in' };

    const { data, error } = await supabase
      .from('practice_openings')
      .insert({
        user_id: user.id,
        name: row.name,
        fen: row.fen,
        orientation: row.orientation,
        mode: row.mode,
        category: row.category,
        source: row.source || 'user',
        move_number: row.moveNumber || 0,
        top_move_choices: row.topMoveChoices || 0,
        quality_tracked_moves: row.qualityTrackedMoves || 0,
      })
      .select()
      .single();

    if (error) {
      const capHit = error.message?.includes('practice_openings_cap_exceeded');
      return { success: false, error: capHit ? 'cap' : error };
    }
    return { success: true, data };
  } catch (e) {
    console.error('insertPracticeOpening exception:', e);
    return { success: false, error: e };
  }
}

export async function deletePracticeOpening(id) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not logged in' };

    const { error } = await supabase
      .from('practice_openings')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('deletePracticeOpening error:', error);
      return { success: false, error };
    }
    return { success: true };
  } catch (e) {
    console.error('deletePracticeOpening exception:', e);
    return { success: false, error: e };
  }
}
