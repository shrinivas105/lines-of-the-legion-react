// components/LichessConnectButton.jsx
// Replaces lichess-auth.js's renderButton() DOM painting with a React component.
// Behavior preserved exactly: shows "Connect Lichess" or "Lichess (connected)"
// state, disconnect still does a full page reload exactly like the original
// (`LichessAuth.disconnect(); location.reload();`).
import { useState } from 'react';
import { isConnected, startLogin, disconnect } from '../services/lichessAuth';
import './LichessConnectButton.css';

export function LichessConnectButton() {
  // isConnected() just reads localStorage synchronously, so a lazy useState
  // initializer (runs once on mount) is enough — no effect needed.
  const [connected] = useState(() => isConnected());

  if (connected) {
    return (
      <button
        className="lichess-btn lichess-btn--connected"
        onClick={() => { disconnect(); window.location.reload(); }}
      >
        ♟ Lichess ✓
      </button>
    );
  }

  return (
    <button className="lichess-btn" onClick={() => startLogin()}>
      ♟ Connect Lichess
    </button>
  );
}

export default LichessConnectButton;
