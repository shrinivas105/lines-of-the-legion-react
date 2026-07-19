// components/PieceStyleToggle.jsx — lets the player switch which piece
// artwork is used on the board (custom Roman set vs. the original classic
// Wikimedia set). Lives in the topbar next to AuthBar (Lichess/Sync).
import { useEffect, useRef, useState } from 'react';
import { PIECE_STYLES } from '../services/chessApi';
import './PieceStyleToggle.css';

export function PieceStyleToggle({ app }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = (styleKey) => {
    app.setPieceStyle(styleKey);
    setOpen(false);
  };

  return (
    <div className="piece-style-toggle" ref={rootRef}>
      <button
        type="button"
        className="piece-style-toggle__btn"
        onClick={() => setOpen((o) => !o)}
        aria-label="Change piece style"
        title="Change piece style"
        aria-haspopup="true"
        aria-expanded={open}
      >
        🐴
      </button>

      {open && (
        <div className="piece-style-toggle__menu" role="menu">
          {Object.entries(PIECE_STYLES).map(([key, { label }]) => (
            <button
              key={key}
              type="button"
              role="menuitemradio"
              aria-checked={app.pieceStyle === key}
              className={
                'piece-style-toggle__option' +
                (app.pieceStyle === key ? ' piece-style-toggle__option--active' : '')
              }
              onClick={() => handleSelect(key)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default PieceStyleToggle;
