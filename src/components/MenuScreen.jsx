// components/MenuScreen.jsx — main landing screen.
// Mirrors renderMenu() in ui-renderer.js: same copy text, same three campaign
// buttons (Master / Club / Practice) calling the same app methods, same
// collapsible rules section content. Visual presentation redesigned using
// the Panel/Button/LegionCard system; the reset button (previously unwired —
// a dead button in the legacy snapshot, see code comment) now correctly
// calls app.resetStats() behind a confirm dialog, matching the button's own
// label and the existing (already-implemented) resetStats() method.
import { useState } from 'react';
import { RomanBattleEffects } from '../logic/romanBattleEffects';
import './MenuScreen.css';

export function MenuScreen({ app }) {
  const [rulesOpen, setRulesOpen] = useState(false);

  const handleSelectSource = (source) => {
    if (typeof RomanBattleEffects !== 'undefined') {
      RomanBattleEffects.playMenuFanfare();
    }

    if (source === 'practice') {
      app.startPracticePicker();
      return;
    }

    app.selectSource(source);
  };

  const handleReset = () => {
    if (window.confirm('Reset all progress? This clears every Legion rank, merit, and battle history. This cannot be undone.')) {
      app.resetStats();
    }
  };

  return (
    <div className="menu-screen page-transition">
      <div className="menu-screen__wrap">
        <h1 className="menu-title">LINES OF THE LEGION</h1>
        <p className="menu-subtitle">Master opening theory through Roman military ranks</p>

        <div className="game-description">
          <p>
            Enter the battlefield where chess mastery meets Roman military glory. Every move you make is judged against
            the greatest games in history. Will you rise through the ranks from humble <strong>Recruit</strong> to legendary
            <strong>Legatus</strong>?
          </p>
          <p>
            Each battle tests your knowledge of opening theory. Play moves that match the masters, maintain strong positions,
            and prove your tactical prowess. Earn merit through discipline and excellence, but beware—poor performance leads
            to demotion and disgrace.
          </p>
          <p>
            Choose your campaign and step onto the field of glory. <em>Veni, vidi, vici!</em>
          </p>
        </div>

        <div className="menu-home">
          <div className="menu-campaigns">
            <h3 className="menu-campaigns__title">Choose Your Campaign</h3>
            <button className="menu-btn campaign-btn gold-btn" type="button" onClick={() => handleSelectSource('master')}>
              <span className="campaign-btn-icon">🏆</span>
              <span className="campaign-btn-label">Master</span>
            </button>
            <button className="menu-btn campaign-btn silver-btn" type="button" onClick={() => handleSelectSource('lichess')}>
              <span className="campaign-btn-icon">♟️</span>
              <span className="campaign-btn-label">Club</span>
            </button>
            <button className="menu-btn campaign-btn bronze-btn" type="button" onClick={() => handleSelectSource('practice')}>
              <span className="campaign-btn-icon">📖</span>
              <span className="campaign-btn-label">Practice</span>
            </button>
            <button className="menu-btn campaign-btn silver-btn" type="button" onClick={handleReset}>
              <span className="campaign-btn-icon">↺</span>
              <span className="campaign-btn-label">Reset Progress</span>
            </button>
          </div>

          <div className="menu-rules">
            <button className="rules-toggle" type="button" onClick={() => setRulesOpen(v => !v)}>
              <span>📜 GAME RULES</span>
              <span>{rulesOpen ? '▲' : '▼'}</span>
            </button>
            {rulesOpen && (
              <div className="rules-content">
                <p>
                  Your ultimate aim is to earn 1,750 Merit and ascend to <strong>Legatus</strong> — the highest rank of the Roman army.
                </p>

                <h4>1. THE BATTLE</h4>
                <ul>
                  <li><strong>Masters Mode:</strong> Elite games. The battle ends if the resulting position has fewer than 5 games in history.</li>
                  <li><strong>Club Mode:</strong> Club games. The battle ends if the resulting position has fewer than 20 games in history.</li>
                  <li>One hint per battle (Top 5 moves)</li>
                </ul>

                <h4>2. MERIT SCORING</h4>
                <ul>
                  <li>Number of moves played while staying within theory</li>
                  <li>Quality of moves compared to top historical choices</li>
                  <li>Final position evaluation when the battle ends</li>
                </ul>

                <h4>3. BATTLE RANKS</h4>
                <p>🪖 Levy (0–39) · 🛡️ Hastatus (40–54) · ⚔️ Principes (55–69)<br />🦅 Triarius (70–84) · 👑 Imperator (85–100)</p>

                <h4>4. LEGION RANKS</h4>
                <p>🌱 Recruit (0) → 🛡️ Legionary (200) → ⚔️ Optio (500)<br />🦅 Centurion (900) → 🏅 Tribunus (1300) → 🏆 Legatus (1750)</p>

                <h4>5. DEMOTION &amp; DISCIPLINE</h4>
                <table>
                  <thead>
                    <tr>
                      <th>Current Rank</th>
                      <th>Poor Performance<br />(Last 5 Battles)</th>
                      <th>Demoted To</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>Recruit</td><td style={{ color: '#777' }}>N/A</td><td style={{ color: '#777' }}>N/A</td></tr>
                    <tr><td>Legionary</td><td>2 Levy battles</td><td>Recruit (or reset to 200 if 350+ merit)</td></tr>
                    <tr><td>Optio</td><td>2 Levy OR<br />2 Hastatus OR<br />1 Levy + 1 Hastatus</td><td>Legionary (or reset to 500 if 700+ merit)</td></tr>
                    <tr><td>Centurion</td><td>ANY Levy/Hastatus OR<br />No Triarius/Imperator in 5 battles</td><td>Optio (or reset to 900 if 1100+ merit)</td></tr>
                    <tr><td>Tribunus</td><td>ANY Levy/Hastatus OR<br />Less than 3 Triarius/Imperator</td><td>Centurion (or reset to 1300 if 1525+ merit)</td></tr>
                    <tr><td>Legatus</td><td style={{ color: '#777' }}>N/A</td><td style={{ color: '#777' }}>N/A</td></tr>
                  </tbody>
                </table>

                <h4>6. PROMOTION REQUIREMENTS</h4>
                <ul>
                  <li><strong>Recruit → Legionary:</strong> 200 merit (no other requirements)</li>
                  <li><strong>Legionary → Optio:</strong> 500 merit (avoid 2 Levy)</li>
                  <li><strong>Optio → Centurion:</strong> 900 merit (avoid demotion triggers)</li>
                  <li><strong>Centurion → Tribunus:</strong> 1300 merit + at least 1 Triarius/Imperator</li>
                  <li><strong>Tribunus → Legatus:</strong> 1750 merit + at least 3 Triarius/Imperator</li>
                </ul>

                <h4>7. SAFETY NET (50% RULE)</h4>
                <p>
                  If you reach 50% progress toward your next rank, demotion resets you to the start of your current rank instead of dropping you to the previous rank.<br />
                  <strong>Safety Thresholds:</strong> Legionary (350), Optio (700), Centurion (1100), Tribunus (1525)
                </p>
              </div>
            )}
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}

// ── Footer (donation + credits) ─────────────────────────────────────────
// Mirrors renderFooter()/renderSupporters() exactly. SUPPORTERS list and
// PayPal link are placeholders in the original too — kept as-is.
const DONATION_PAYPAL = 'https://paypal.me/yourhandle';
const SUPPORTERS = [
  // { name: 'Arjun', country: 'IN' },
];

function toFlag(code) {
  try {
    return code.toUpperCase().split('').map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('');
  } catch {
    return `[${code.toUpperCase()}]`;
  }
}

function Footer() {
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [supportersOpen, setSupportersOpen] = useState(false);

  return (
    <div className="menu-screen__footer">
      <a
        href={DONATION_PAYPAL}
        target="_blank"
        rel="noopener noreferrer"
        className="menu-screen__donate"
      >
        ☕ Enjoyed this game ? Leave a tip using Paypal
      </a>

      {SUPPORTERS.length > 0 && (
        <>
          <button className="menu-screen__toggle" onClick={() => setSupportersOpen(v => !v)}>
            <span>🙏 Supporters</span><span>{supportersOpen ? '▲' : '▼'}</span>
          </button>
          {supportersOpen && (
            <div className="menu-screen__supporters">
              {SUPPORTERS.map((s, i) => (
                <div key={i} className="menu-screen__supporter">
                  <span>{toFlag(s.country)}</span><span>{s.name}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <button className="menu-screen__toggle" onClick={() => setCreditsOpen(v => !v)}>
        <span>about</span><span>{creditsOpen ? '▲' : '▼'}</span>
      </button>
      {creditsOpen && (
        <p className="menu-screen__footnote">
          This is a completely free application — no subscriptions, no paywalls.<br />
          If you enjoy it, support me via PayPal above or reach out at{' '}
          <a href="mailto:linesofthelegion@gmail.com">linesofthelegion@gmail.com</a><br />
          Thanks to <a href="https://lichess.org" target="_blank" rel="noopener noreferrer">Lichess</a>{' '}
          and <a href="https://chess-api.com" target="_blank" rel="noopener noreferrer">Chess-API</a> for their free APIs.
        </p>
      )}
    </div>
  );
}

export default MenuScreen;
