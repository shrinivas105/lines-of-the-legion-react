// components/HomeButton.jsx — fixed top-left "return home" control.
// Calls app.goHome() exactly as the legacy `onclick="app.goHome()"` did.
import './HomeButton.css';

export function HomeButton({ app }) {
  return (
    <button className="home-btn" onClick={() => app.goHome()}>
      🏠 Home
    </button>
  );
}

export default HomeButton;
