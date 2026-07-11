// components/LichessConnectButton.jsx
// Replaces lichess-auth.js's renderButton() DOM painting with a React component.
// Behavior preserved exactly: shows "Connect Lichess" or "Lichess (connected)"
// state, disconnect still does a full page reload exactly like the original
// (`LichessAuth.disconnect(); location.reload();`).
import { useState } from 'react';
import { isConnected, startLogin, disconnect } from '../services/lichessAuth';
import { Button } from './Button';
import './LichessConnectButton.css';

export function LichessConnectButton() {
  // isConnected() just reads localStorage synchronously, so a lazy useState
  // initializer (runs once on mount) is enough — no effect needed.
  const [connected] = useState(() => isConnected());

  if (connected) {
    return (
      <Button variant="danger" size="sm" onClick={() => { disconnect(); window.location.reload(); }}>
        ♟ Lichess ✓
      </Button>
    );
  }

  return (
    <Button variant="danger" size="sm" onClick={() => startLogin()}>
      ♟ Connect Lichess
    </Button>
  );
}

export default LichessConnectButton;
