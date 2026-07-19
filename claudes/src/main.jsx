import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import App from './App.jsx'
import { init as initLichessAuth } from './services/lichessAuth'

function getInitialTheme() {
  // Light/dark toggle is temporarily hidden — dark mode is the only mode
  // for now, regardless of what a user previously had stored (otherwise
  // anyone who'd switched to light mode would be stuck in it with no way
  // back, since the toggle button is no longer rendered). Restore the
  // localStorage-based logic below when the toggle comes back.
  return 'night';

  // if (typeof window === 'undefined') {
  //   return 'night';
  // }
  //
  // const stored = window.localStorage.getItem('roman-theme');
  // return stored === 'marble' ? 'marble' : 'night';
}

// Matches the original main.js entry sequencing exactly:
//   (async () => { await LichessAuth.init(); LichessAuth.renderButton(); window.app = new ChessTheoryApp(); })()
// LichessAuth.init() exchanges the ?code=... param from the OAuth redirect
// for an access token (handleCallback()) BEFORE the app mounts, so that by
// the time ChessTheoryApp/useChessTheoryApp run, isConnected() already
// reflects the freshly-completed connection. renderButton() doesn't apply
// here since React owns rendering (see LichessConnectButton.jsx).
async function bootstrap() {
  const theme = getInitialTheme();
  document.documentElement.setAttribute('data-theme', theme);
  window.localStorage.setItem('roman-theme', theme);

  await initLichessAuth();

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

bootstrap();
