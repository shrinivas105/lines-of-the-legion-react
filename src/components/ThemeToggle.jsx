import { useEffect, useState } from 'react';
import './ThemeToggle.css';

const STORAGE_KEY = 'roman-theme';

function getInitialTheme() {
  if (typeof window === 'undefined') {
    return 'night';
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'marble' ? 'marble' : 'night';
}

export function ThemeToggle() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return (
    <label className="theme-toggle" htmlFor="roman-theme-select">
      <span className="theme-toggle__label">Theme</span>
      <select
        id="roman-theme-select"
        className="theme-toggle__select"
        value={theme}
        onChange={(event) => setTheme(event.target.value)}
        aria-label="Select application theme"
      >
        <option value="night">🌙 Imperial Night</option>
        <option value="marble">☀️ Imperial Marble</option>
      </select>
    </label>
  );
}

export default ThemeToggle;
