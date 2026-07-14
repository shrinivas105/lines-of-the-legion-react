// lichess-auth.js - Client-side Lichess OAuth 2.0 PKCE flow
// No server needed. Token is stored in localStorage and sent with explorer API calls.
// Docs: https://lichess.org/api#tag/OAuth

const LichessAuth = (() => {
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

  function getToken() {
    return localStorage.getItem(STORAGE_KEY);
  }

  function isConnected() {
    return !!getToken();
  }

  function disconnect() {
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
  async function startLogin() {
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
  async function handleCallback() {
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
  function authHeader() {
    const token = getToken();
    return token ? `Bearer ${token}` : null;
  }

// skk

  /**
   * Renders a small "Connect Lichess" / "Disconnect" button.
   * Insert `<div id="lichess-auth-btn"></div>` wherever you want it in your UI,
   * then call LichessAuth.renderButton() after the DOM is ready.
   */
  function renderButton(containerId = 'lichess-auth-btn') {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (isConnected()) {
      el.innerHTML = `
        <button class="lichess-connected-btn" onclick="LichessAuth.disconnect(); location.reload();">
          ♟ Lichess ✓
        </button>`;
    } else {
      el.innerHTML = `
        <button class="lichess-connect-btn" onclick="LichessAuth.startLogin()">
          ♟ Connect Lichess
        </button>`;
    }
  }

  // ── Auto-handle callback on every page load ───────────────────────────────
  // Returns a Promise so main.js can await it before rendering the app.
  async function init() {
    return await handleCallback();
  }

  return { init, startLogin, disconnect, isConnected, getToken, authHeader, renderButton };
})();

window.LichessAuth = LichessAuth;
