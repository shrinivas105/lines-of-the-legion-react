// components/HomeButton.jsx — fixed top-left "return home" control.
// Calls app.goHome() exactly as the legacy `onclick="app.goHome()"` did —
// UNLESS a real (non-practice) battle is still in progress, in which case
// leaving would otherwise let the player dodge a bad score by bailing out
// while losing. See LeaveBattleDialog.jsx for the shared warning dialog
// (also used by GameScreen's Quit Game button).
import { useLeaveBattleConfirm, LeaveBattleDialog } from './LeaveBattleDialog';
import { IconRomanTemple } from './RomanIcons';
import './HomeButton.css';

export function HomeButton({ app }) {
  const { showConfirm, leaving, handleTriggerClick, handleConfirmLeave, cancel } = useLeaveBattleConfirm(app);

  return (
    <>
      <button className="home-btn" onClick={handleTriggerClick}>
        <IconRomanTemple className="home-btn__icon" aria-hidden="true" /> Home
      </button>
      <LeaveBattleDialog
        app={app}
        showConfirm={showConfirm}
        leaving={leaving}
        onConfirm={handleConfirmLeave}
        onCancel={cancel}
      />
    </>
  );
}

export default HomeButton;
