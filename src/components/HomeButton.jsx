// components/HomeButton.jsx — fixed top-left "return home" control.
// Calls app.goHome() exactly as the legacy `onclick="app.goHome()"` did —
// UNLESS a real (non-practice) battle is still in progress, in which case
// leaving would otherwise let the player dodge a bad score by bailing out
// while losing. In that case a confirm dialog warns the player first; only
// on confirmation does it call app.leaveBattleAsForfeit(), which scores the
// battle as a forfeit at its current position before going home.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { IconRomanTemple } from './RomanIcons';
import { legionVariant } from '../utils/legionVariant';
import './CaptureModal.css';
import './HomeButton.css';

export function HomeButton({ app }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const campaignVariant = legionVariant(app);

  const handleClick = () => {
    if (app.hasUnresolvedBattle()) {
      setShowConfirm(true);
    } else {
      app.goHome();
    }
  };

  const handleConfirmLeave = async () => {
    if (leaving) return;
    setLeaving(true);
    await app.leaveBattleAsForfeit();
    // No need to reset `leaving`/`showConfirm` — leaveBattleAsForfeit()
    // navigates home, unmounting this dialog.
  };

  return (
    <>
      <button className="home-btn" onClick={handleClick}>
        <IconRomanTemple className="home-btn__icon" aria-hidden="true" /> Home
      </button>

      {showConfirm && createPortal(
        <div className={`capture-modal campaign-${campaignVariant}`} role="dialog" aria-modal="true" aria-labelledby="leave-battle-title">
          <div className="capture-modal__backdrop" onClick={() => !leaving && setShowConfirm(false)} />
          <div className="capture-modal__panel">
            <h2 id="leave-battle-title" className="capture-modal__title">Leave Battle?</h2>
            <p className="capture-modal__message">
              Leaving now counts as a loss, scored at the current position. This can't be undone.
            </p>
            <div className="capture-modal__actions">
              <Button variant="danger" size="md" disabled={leaving} onClick={handleConfirmLeave}>
                {leaving ? 'Leaving…' : 'Leave (Forfeit)'}
              </Button>
              <Button variant="ghost" size="md" disabled={leaving} onClick={() => setShowConfirm(false)}>
                Keep Playing
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default HomeButton;
