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

  const isNight = theme === 'night';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme(isNight ? 'marble' : 'night')}
      aria-label={isNight ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isNight ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {isNight ? (
        // Moon — shown while in dark mode; clicking switches to light
        <svg className="theme-toggle__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z"
            fill="currentColor"
          />
        </svg>
      ) : (
        // Sun — shown while in light mode; clicking switches to dark
        <svg className="theme-toggle__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="12" y1="1.5" x2="12" y2="4" />
            <line x1="12" y1="20" x2="12" y2="22.5" />
            <line x1="1.5" y1="12" x2="4" y2="12" />
            <line x1="20" y1="12" x2="22.5" y2="12" />
            <line x1="4.2" y1="4.2" x2="5.9" y2="5.9" />
            <line x1="18.1" y1="18.1" x2="19.8" y2="19.8" />
            <line x1="4.2" y1="19.8" x2="5.9" y2="18.1" />
            <line x1="18.1" y1="5.9" x2="19.8" y2="4.2" />
          </g>
        </svg>
      )}
    </button>
  );
}

export default ThemeToggle;
