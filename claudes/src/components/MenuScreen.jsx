// components/MenuScreen.jsx — main landing screen.
// Mirrors renderMenu() in the current legacy ui-renderer.js: rules link sits
// inline at the end of the game description (expanding in place, not a
// separate side panel), and Reset / About / Tip live together as a single
// quick-actions row beneath the campaign cards.
import { useState } from 'react';
import { RomanBattleEffects } from '../logic/romanBattleEffects';
import { CampaignCard } from './CampaignCard';
import masterCardArt from '../assets/campaign-cards/master-card.webp';
import clubCardArt from '../assets/campaign-cards/club-card.webp';
import practiceCardArt from '../assets/campaign-cards/practice-card.webp';
import './MenuScreen.css';

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

export function MenuScreen({ app }) {
  const [rulesOpen, setRulesOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

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
    <div className="menu page-transition">
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
          <p className="tagline-line">
            Choose your campaign and step onto the field of glory. <em>Veni, vidi, vici!</em>
            <span className="rules-link-line">
              <span className="rules-link" onClick={() => setRulesOpen(v => !v)}>
                Read Rules <span>{rulesOpen ? '▲' : '▼'}</span>
              </span>
            </span>
          </p>

          {rulesOpen && (
            <div className="rules-content">
              <p style={{ marginBottom: '10px' }}>
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
              <p>
                <span className="battle-rank battle-rank--levy">🪖 Levy</span> (0–39) ·
                <span className="battle-rank battle-rank--hastatus"> 🛡️ Hastatus</span> (40–54) ·
                <span className="battle-rank battle-rank--principes"> ⚔️ Principes</span> (55–69)<br />
                <span className="battle-rank battle-rank--triarius">🦅 Triarius</span> (70–84) ·
                <span className="battle-rank battle-rank--imperator"> 👑 Imperator</span> (85–100)
              </p>

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

        <div className="menu-home">
          <div className="menu-campaigns">
            <h3 className="menu-campaigns__title">Choose Your Campaign</h3>
            <div className="campaign-cards">
              <CampaignCard
                title="MASTER"
                image={masterCardArt}
                frameType="gold"
                onClick={() => handleSelectSource('master')}
              />
              <CampaignCard
                title="CLUB"
                image={clubCardArt}
                frameType="silver"
                onClick={() => handleSelectSource('lichess')}
              />
              <CampaignCard
                title="PRACTICE"
                image={practiceCardArt}
                frameType="bronze"
                onClick={() => handleSelectSource('practice')}
              />
            </div>
          </div>
        </div>

        <hr className="menu-divider" />

        <div className="quick-actions">
          <div className="quick-action-col">
            <button className="quick-action-toggle" type="button" onClick={handleReset}>
              <span className="quick-action-icon">↺</span>
              <span className="quick-action-label">Reset</span>
            </button>
          </div>

          <div className="quick-action-col">
            <button
              className={`quick-action-toggle${aboutOpen ? ' active' : ''}`}
              type="button"
              onClick={() => setAboutOpen(v => !v)}
            >
              <span className="quick-action-icon">ℹ️</span>
              <span className="quick-action-label">About</span>
            </button>
          </div>

          <div className="quick-action-col">
            <a
              href={DONATION_PAYPAL}
              target="_blank"
              rel="noopener noreferrer"
              className="quick-action-toggle"
            >
              <span className="quick-action-icon">☕</span>
              <span className="quick-action-label">Tip</span>
            </a>
          </div>
        </div>

        {aboutOpen && (
          <div className="about-content">
            <p className="footer-note">
              This is a completely free application — no subscriptions, no paywalls.<br />
              If you enjoy it, support me via the Tip link above or reach out at{' '}
              <a href="mailto:linesofthelegion@gmail.com">linesofthelegion@gmail.com</a><br />
              Thanks to <a href="https://lichess.org" target="_blank" rel="noopener noreferrer">Lichess</a>{' '}
              and <a href="https://chess-api.com" target="_blank" rel="noopener noreferrer">Chess-API</a> for their free APIs.
            </p>
          </div>
        )}

        <Footer />
      </div>
    </div>
  );
}

// ── Footer (supporters list only — donation + about now live in the
// quick-actions row above) ──────────────────────────────────────────────
function Footer() {
  const [supportersOpen, setSupportersOpen] = useState(false);

  if (SUPPORTERS.length === 0) return null;

  return (
    <div className="menu-screen__footer">
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
    </div>
  );
}

export default MenuScreen;
