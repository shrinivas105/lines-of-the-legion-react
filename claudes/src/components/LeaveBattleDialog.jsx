// components/LeaveBattleDialog.jsx — shared "leaving now counts as a loss"
// confirmation, used by both HomeButton (top-left Home control) and
// GameScreen's in-battle Quit Game button, so the warning and forfeit
// behavior stay identical no matter which control the player uses to leave.
//
// useLeaveBattleConfirm(app) owns the click/confirm/cancel logic and state;
// <LeaveBattleDialog /> is just the modal markup. Callers render their own
// trigger (a fixed-position pill for Home, an in-line Button for Quit Game)
// and wire it to handleTriggerClick.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { legionVariant } from '../utils/legionVariant';
import './CaptureModal.css';

export function useLeaveBattleConfirm(app) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // If there's nothing at stake (menu, practice, or a battle that's already
  // been scored), leave immediately — the warning is only for a real,
  // unresolved battle. See ChessTheoryApp.hasUnresolvedBattle().
  const handleTriggerClick = () => {
    if (app.hasUnresolvedBattle()) {
      setShowConfirm(true);
    } else {
      app.goHome();
    }
  };

  const handleConfirmLeave = async () => {
    if (leaving) return;
    setLeaving(true);
    // ChessTheoryApp.leaveBattleAsForfeit() scores the battle as a forfeit
    // at its current position, then navigates home — no need to reset
    // leaving/showConfirm afterward, since that unmounts this dialog.
    await app.leaveBattleAsForfeit();
  };

  const cancel = () => {
    if (!leaving) setShowConfirm(false);
  };

  return { showConfirm, leaving, handleTriggerClick, handleConfirmLeave, cancel };
}

export function LeaveBattleDialog({ app, showConfirm, leaving, onConfirm, onCancel }) {
  const campaignVariant = legionVariant(app);
  if (!showConfirm) return null;

  return createPortal(
    <div className={`capture-modal campaign-${campaignVariant}`} role="dialog" aria-modal="true" aria-labelledby="leave-battle-title">
      <div className="capture-modal__backdrop" onClick={onCancel} />
      <div className="capture-modal__panel">
        <h2 id="leave-battle-title" className="capture-modal__title">Leave Battle?</h2>
        <p className="capture-modal__message">
          Leaving now counts as a loss, scored at the current position. This can't be undone.
        </p>
        <div className="capture-modal__actions">
          <Button variant="danger" size="md" disabled={leaving} onClick={onConfirm}>
            {leaving ? 'Leaving…' : 'Leave (Forfeit)'}
          </Button>
          <Button variant="ghost" size="md" disabled={leaving} onClick={onCancel}>
            Keep Playing
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default LeaveBattleDialog;
