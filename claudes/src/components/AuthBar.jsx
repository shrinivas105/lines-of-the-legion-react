// components/AuthBar.jsx — fixed top-right auth section.
// Mirrors renderAuthSection() in ui-renderer.js: shows sign-in button when
// logged out, or email + sign-out when logged in, plus the Lichess connect
// button alongside it. Logic delegates entirely to app.auth (AuthModule),
// unchanged from the legacy auth.js.
import { LichessConnectButton } from './LichessConnectButton';
import './AuthBar.css';

export function AuthBar({ app }) {
  const { auth } = app;

  return (
    <div className="auth-bar">
      {auth.isLoggedIn ? (
        <div className="auth-bar__user">
          <span className="auth-bar__email">✓ {auth.user?.email?.split('@')[0]}</span>
          <button className="auth-bar__signout" onClick={() => auth.handleSignOut()}>
            Sign Out
          </button>
        </div>
      ) : (
        <button className="auth-bar__signin" onClick={() => auth.handleSignIn()}>
          🔐 Sync
        </button>
      )}
      <LichessConnectButton />
    </div>
  );
}

export default AuthBar;
