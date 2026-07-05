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
    flowType: 'implicit',
  }
});

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
        skipBrowserRedirect: false,
        queryParams: { access_type: 'offline', prompt: 'select_account' }
      }
    });
    if (error) throw error;
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
      .from('user_progress')
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
      .from('user_progress')
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
