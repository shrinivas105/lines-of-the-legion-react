// components/HomeButton.jsx — fixed top-left "return home" control.
// Calls app.goHome() exactly as the legacy `onclick="app.goHome()"` did.
import { IconRomanTemple } from './RomanIcons';
import './HomeButton.css';

export function HomeButton({ app }) {
  return (
    <button className="home-btn" onClick={() => app.goHome()}>
      <IconRomanTemple className="home-btn__icon" aria-hidden="true" /> Home
    </button>
  );
}

export default HomeButton;
