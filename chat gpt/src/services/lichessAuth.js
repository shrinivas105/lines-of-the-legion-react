// services/lichessAuth.js - Client-side Lichess OAuth 2.0 PKCE flow
// Converted from lichess-auth.js (IIFE module -> ES module). Logic preserved
// verbatim. renderButton()'s DOM painting is removed — React owns rendering
// via the LichessConnectButton component, which calls isConnected()/startLogin()/
// disconnect() directly.

const STORAGE_KEY   = 'lichess_access_token';
const VERIFIER_KEY  = 'lichess_pkce_verifier';
const STATE_KEY     = 'lichess_oauth_state';
const CLIENT_ID     = 'lines-of-the-legion'; // any stable unique string for your app
const LICHESS_HOST  = 'https://lichess.org';

// ── PKCE helpers ──────────────────────────────────────────────────────────

function randomString(length = 48) {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function sha256Base64Url(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// ── Public API ────────────────────────────────────────────────────────────

export function getToken() {
  return localStorage.getItem(STORAGE_KEY);
}

export function isConnected() {
  return !!getToken();
}

export function disconnect() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(VERIFIER_KEY);
  localStorage.removeItem(STATE_KEY);
  console.log('✓ Lichess token removed');
}

/**
 * Step 1 – Redirect the user to Lichess to authorise.
 * We only need `preference:read` for the opening explorer.
 * Actually the explorer just needs a valid authenticated request —
 * any scope (even empty string / just being logged in) works.
 * We request no special scopes so the consent screen is minimal.
 */
export async function startLogin() {
  const verifier  = randomString(48);
  const state     = randomString(16);
  const challenge = await sha256Base64Url(verifier);
  const redirect  = window.location.origin + window.location.pathname;

  localStorage.setItem(VERIFIER_KEY, verifier);
  localStorage.setItem(STATE_KEY, state);

  const params = new URLSearchParams({
    response_type:         'code',
    client_id:             CLIENT_ID,
    redirect_uri:          redirect,
    scope:                 '',           // explorer only needs a valid token, no special scope
    code_challenge_method: 'S256',
    code_challenge:        challenge,
    state:                 state,
  });

  window.location.href = `${LICHESS_HOST}/oauth?${params}`;
}

/**
 * Step 2 – After Lichess redirects back, exchange the code for a token.
 * Call this once on page load; it's a no-op when there's no ?code= param.
 * Returns true if a new token was acquired.
 */
export async function handleCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code      = urlParams.get('code');
  const state     = urlParams.get('state');
  const error     = urlParams.get('error');

  if (error) {
    console.error('Lichess OAuth error:', error, urlParams.get('error_description'));
    window.history.replaceState({}, '', window.location.pathname);
    return false;
  }

  if (!code) return false; // normal page load, nothing to do

  // Validate state
  const savedState = localStorage.getItem(STATE_KEY);
  if (state !== savedState) {
    console.error('OAuth state mismatch – possible CSRF');
    window.history.replaceState({}, '', window.location.pathname);
    return false;
  }

  const verifier = localStorage.getItem(VERIFIER_KEY);
  if (!verifier) {
    console.error('Missing PKCE verifier');
    window.history.replaceState({}, '', window.location.pathname);
    return false;
  }

  const redirect = window.location.origin + window.location.pathname;

  try {
    console.log('🔄 Exchanging Lichess code for token…');
    const resp = await fetch(`${LICHESS_HOST}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        client_id:     CLIENT_ID,
        code,
        code_verifier: verifier,
        redirect_uri:  redirect,
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error('Token exchange failed:', resp.status, txt);
      return false;
    }

    const json = await resp.json();
    if (json.access_token) {
      localStorage.setItem(STORAGE_KEY, json.access_token);
      console.log('✅ Lichess token stored');
    }
  } catch (e) {
    console.error('Token exchange error:', e);
    return false;
  } finally {
    // Always clean up URL and temp storage
    localStorage.removeItem(VERIFIER_KEY);
    localStorage.removeItem(STATE_KEY);
    window.history.replaceState({}, '', window.location.pathname);
  }

  return true;
}

/**
 * Returns the Authorization header value, or null if not connected.
 */
export function authHeader() {
  const token = getToken();
  return token ? `Bearer ${token}` : null;
}

// ── Auto-handle callback on every page load ───────────────────────────────
// Returns a Promise so the app can await it before rendering.
export async function init() {
  return await handleCallback();
}

export const LichessAuth = { init, startLogin, disconnect, isConnected, getToken, authHeader };

export default LichessAuth;
