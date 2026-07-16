// components/LichessConnectButton.jsx
// Replaces lichess-auth.js's renderButton() DOM painting with a React component.
// Behavior preserved exactly: shows "Connect Lichess" or "Lichess (connected)"
// state, disconnect still does a full page reload exactly like the original
// (`LichessAuth.disconnect(); location.reload();`).
import { useState } from 'react';
import { isConnected, startLogin, disconnect } from '../services/lichessAuth';
import { Button } from './Button';
import { IconChessKnightLaurel, IconCircularLaurel } from './RomanIcons';
import './LichessConnectButton.css';

export function LichessConnectButton() {
  // isConnected() just reads localStorage synchronously, so a lazy useState
  // initializer (runs once on mount) is enough — no effect needed.
  const [connected] = useState(() => isConnected());

  if (connected) {
    return (
      <Button variant="danger" size="sm" onClick={() => { disconnect(); window.location.reload(); }}>
        <IconChessKnightLaurel className="lichess-btn__icon" aria-hidden="true" /> Lichess <IconCircularLaurel className="lichess-btn__icon lichess-btn__icon--sm" aria-hidden="true" />
      </Button>
    );
  }

  return (
    <Button variant="danger" size="sm" onClick={() => startLogin()}>
      <IconChessKnightLaurel className="lichess-btn__icon" aria-hidden="true" /> Connect Lichess
    </Button>
  );
}

export default LichessConnectButton;
