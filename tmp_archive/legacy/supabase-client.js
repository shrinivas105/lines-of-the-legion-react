// js/supabase-client.js
// Fixed: Complete OAuth flow with proper error handling and database operations

const supabaseUrl = 'https://lvnmwycnrkltcechihai.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2bm13eWNucmtsdGNlY2hpaGFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MTMyOTgsImV4cCI6MjA4MjQ4OTI5OH0.8SuFBDcBaOFHFAnt3C4mero3Y38AnjshvAUL7a1ncwo';

// Helper to get the correct URL (browser-safe)
function getURL() {
  // Use window.location for browser environment
  let url = window.location.origin;
  
  // Make sure to include trailing /
  url = url.endsWith('/') ? url : `${url}/`;
  
  return url;
}

// Only create client if it doesn't exist
if (typeof window.supabaseClient === 'undefined') {
  window.supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: 'chess-theory-supabase-auth',
      flowType: 'implicit',
      // Add storage event listener to sync across tabs
      storageKey: 'chess-theory-supabase-auth'
    }
  });
  console.log('✓ Supabase client initialized');
  
  // Immediately clean stale OAuth params from URL if present
  const params = new URLSearchParams(window.location.search);
  if (params.has('access_token') || params.has('refresh_token') || params.has('code')) {
    console.log('🔄 Cleaning OAuth params from URL on load');
    // Give Supabase a moment to process them first
    setTimeout(() => {
      window.history.replaceState({}, document.title, window.location.pathname);
    }, 100);
  }
}

// Helper functions
async function getUser() {
  try {
    const { data: { user }, error } = await window.supabaseClient.auth.getUser();
    if (error) {
      console.error('getUser error:', error);
      return null;
    }
    return user;
  } catch (e) {
    console.error('getUser exception:', e);
    return null;
  }
}

async function signInWithGoogle() {
  try {
    const redirectUrl = getURL();
    console.log('🔐 Starting Google sign-in, will redirect to:', redirectUrl);
    
    // Clear any existing error state
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('error')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    const { data, error } = await window.supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: redirectUrl,
        skipBrowserRedirect: false,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account'
        }
      }
    });
    
    if (error) {
      console.error('❌ OAuth initiation error:', error);
      throw error;
    }
    
    console.log('✓ Google sign-in initiated, redirecting...');
    return { success: true };
  } catch (e) {
    console.error('❌ Sign in error:', e);
    
    // Show user-friendly error
    let errorMsg = 'Sign in failed. ';
    if (e.message.includes('redirect')) {
      errorMsg += 'Redirect URL not configured. Check Supabase dashboard.';
    } else if (e.message.includes('provider')) {
      errorMsg += 'Google provider not enabled. Check Supabase dashboard.';
    } else {
      errorMsg += e.message;
    }
    
    alert(errorMsg);
    return { success: false, error: e.message };
  }
}

async function signOut() {
  try {
    const { error } = await window.supabaseClient.auth.signOut();
    if (error) throw error;
    console.log('✓ Signed out successfully');
    
    // Clear local storage
    localStorage.removeItem('chess-theory-supabase-auth');
    
    // Reload page
    window.location.reload();
  } catch (e) {
    console.error('Sign out error:', e);
    // Force reload anyway
    window.location.reload();
  }
}

async function loadProgress() {
  try {
    const user = await getUser();
    if (!user) {
      console.log('ℹ️ No user logged in - skipping cloud load');
      return null;
    }
    
    console.log('🔍 Loading progress for user:', user.id);
    
    const { data, error } = await window.supabaseClient
      .from('player_progress')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle(); // Changed from .single() to handle 0 or 1 results
    
    if (error) {
      console.error('❌ Load error:', error);
      return null;
    }
    
    if (data) {
      console.log('✓ Progress loaded from cloud:', data);
    } else {
      console.log('ℹ️ No progress record found in cloud');
    }
    return data;
  } catch (e) {
    console.error('❌ loadProgress exception:', e);
    return null;
  }
}

async function saveProgress(progress) {
  try {
    const user = await getUser();
    if (!user) {
      console.log('ℹ️ Not logged in - skipping cloud save');
      return { success: false, reason: 'not_logged_in' };
    }
    
    console.log('💾 Saving progress to cloud for user:', user.id);
    
    const saveData = { 
      user_id: user.id, 
      ...progress,
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await window.supabaseClient
      .from('player_progress')
      .upsert(saveData, { 
        onConflict: 'user_id', // Explicitly specify the conflict column
        ignoreDuplicates: false // Ensure updates happen
      })
      .select();
    
    if (error) {
      console.error('❌ Save error:', error);
      return { success: false, error };
    } else {
      console.log('✓ Progress saved to cloud');
      return { success: true, data };
    }
  } catch (e) {
    console.error('❌ saveProgress exception:', e);
    return { success: false, error: e };
  }
}

// Debug helper - check and clean OAuth state
(function checkOAuthState() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');
  const errorDescription = params.get('error_description');
  const code = params.get('code');
  const accessToken = params.get('access_token');
  
  // If there's an error, log and clean
  if (error) {
    console.error('❌ OAuth callback error:', error);
    console.error('Description:', errorDescription);
    alert(`Login failed: ${errorDescription || error}`);
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  
  // If there's a code or token in URL, Supabase will handle it
  // But if the page has been sitting for a while, the token might be stale
  if (code || accessToken) {
    console.log('🔄 OAuth callback detected, processing...');
    
    // Check if we've been on this page too long (stale token)
    const pageLoadTime = window.performance?.timing?.navigationStart || Date.now();
    const timeSinceLoad = Date.now() - pageLoadTime;
    
    if (timeSinceLoad > 60000) { // More than 1 minute
      console.warn('⚠️ OAuth token may be stale, cleaning URL...');
      window.history.replaceState({}, document.title, window.location.pathname);
      alert('Session expired. Please sign in again.');
      window.location.reload();
    }
  }
})();