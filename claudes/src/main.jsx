import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import App from './App.jsx'
import { init as initLichessAuth } from './services/lichessAuth'

// Matches the original main.js entry sequencing exactly:
//   (async () => { await LichessAuth.init(); LichessAuth.renderButton(); window.app = new ChessTheoryApp(); })()
// LichessAuth.init() exchanges the ?code=... param from the OAuth redirect
// for an access token (handleCallback()) BEFORE the app mounts, so that by
// the time ChessTheoryApp/useChessTheoryApp run, isConnected() already
// reflects the freshly-completed connection. renderButton() doesn't apply
// here since React owns rendering (see LichessConnectButton.jsx).
async function bootstrap() {
  await initLichessAuth();

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

bootstrap();
