// ui-renderer.js - Handles all UI rendering logic
// UPDATED: Fixed auth section to be positioned fixed at top right

// ──────────────────────────────────────────────
// DONATION CONFIG
// Replace with your PayPal.me link.
// PayPal accepts USD (and all major currencies)
// and converts to INR on payout to your bank.
// ──────────────────────────────────────────────
const DONATION_PAYPAL = 'https://paypal.me/yourhandle'; // ← replace this

// ──────────────────────────────────────────────
// SUPPORTERS LIST — add donors here manually.
// Only add someone if they've given permission.
// Each entry: { name, country }
//   name    → displayed as-is
//   country → two-letter ISO code (used for flag emoji)
//             e.g. 'IN' = India, 'US' = USA, 'GB' = UK
// ──────────────────────────────────────────────
const SUPPORTERS = [
  // { name: 'Arjun',   country: 'IN' },
  // { name: 'Sarah',   country: 'US' },
  // { name: 'Marcus',  country: 'DE' },
];

class UIRenderer {
  constructor(app) {
    this.app = app;
  }

  // Converts a 2-letter ISO country code to a flag emoji.
  // Falls back to the raw code in brackets if the emoji
  // doesn't render (e.g. some Windows builds).
  toFlag(code) {
    try {
      return code.toUpperCase().split('').map(
        c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
      ).join('');
    } catch {
      return `[${code.toUpperCase()}]`;
    }
  }

  // Single PayPal donation button.
  renderDonateButtons() {
    return `
      <div class="donate-wrap">
        <a href="${DONATION_PAYPAL}" target="_blank" rel="noopener noreferrer"
           class="coffee-btn coffee-btn--primary"
           style="color:#ffffff !important; text-decoration:none !important; font-size:0.425rem;">
          ☕ Enjoyed this game ? Leave a tip using Paypal
        </a>
      </div>
    `;
  }

  // Renders the supporters list HTML.
  // Returns empty string when the array is empty
  // so the toggle doesn't appear at all until there's
  // at least one supporter.
  renderSupporters() {
    if (SUPPORTERS.length === 0) return '';

    const list = SUPPORTERS.map(s =>
      `<div class="supporter-item">
        <span class="supporter-flag">${this.toFlag(s.country)}</span>
        <span class="supporter-name">${s.name}</span>
      </div>`
    ).join('');

    return `
      <button class="credits-toggle" id="supportersToggle">
        <span>🙏 Supporters</span>
        <span id="supportersArrow">▼</span>
      </button>
      <div id="supportersContent" class="supporters-content" style="display:none;">
        <div class="supporters-list">${list}</div>
      </div>
    `;
  }

  // ──────────────────────────────────────────────
  // Shared footer: donation button + credits.
  // Called by renderMenu() and renderEndGameSummary().
  // ──────────────────────────────────────────────
  renderFooter() {
    return `
      <div class="footer-section">
        ${this.renderDonateButtons()}
        ${this.renderSupporters()}
        <button class="credits-toggle" id="creditsToggle">
          <span>about</span>
          <span id="creditsArrow">▼</span>
        </button>
        <div id="creditsContent" class="credits-content" style="display:none;">
          <p class="footer-note">
            This is a completely free application — no subscriptions, no paywalls.<br>
            If you enjoy it, support me via PayPal above or reach out at
            <a href="mailto:linesofthelegion@gmail.com">linesofthelegion@gmail.com</a><br>
            Thanks to <a href="https://lichess.org" target="_blank" rel="noopener noreferrer">Lichess</a>
            and <a href="https://chess-api.com" target="_blank" rel="noopener noreferrer">Chess-API</a> for their free APIs.
          </p>
        </div>
      </div>
    `;
  }

  // Wires up the credits and supporters toggles after footer HTML is in the DOM.
  bindFooter() {
    const creditsToggle  = document.getElementById('creditsToggle');
    const creditsContent = document.getElementById('creditsContent');
    const creditsArrow   = document.getElementById('creditsArrow');
    if (creditsToggle) {
      creditsToggle.onclick = () => {
        const open = creditsContent.style.display === 'block';
        creditsContent.style.display = open ? 'none' : 'block';
        creditsArrow.textContent = open ? '▼' : '▲';
      };
    }

    const suppToggle  = document.getElementById('supportersToggle');
    const suppContent = document.getElementById('supportersContent');
    const suppArrow   = document.getElementById('supportersArrow');
    if (suppToggle) {
      suppToggle.onclick = () => {
        const open = suppContent.style.display === 'block';
        suppContent.style.display = open ? 'none' : 'block';
        suppArrow.textContent = open ? '▼' : '▲';
      };
    }
  }

  renderBattleHistory(source) {
    const meritKey = `${source}_merit`;
    const currentMerit = this.app.legionMerits[meritKey] || 0;
    const legionInfo = Scoring.getLegionRank(currentMerit);
    const recentRanks = this.app.getRecentBattleRanks(source);
    const warning = Scoring.getDemotionWarning(legionInfo.title, recentRanks, currentMerit);

    if (recentRanks.length === 0) return '';

    const battleBadges = recentRanks.map(rank => {
      const letter = rank[0];
      const className = rank.toLowerCase();
      return `<div class="battle-badge ${className}">${letter}</div>`;
    }).join('');

    return `
      <div class="battle-history">
        <div class="battle-history-title">
          Last ${recentRanks.length} Battle${recentRanks.length > 1 ? 's' : ''}
        </div>
        <div class="battle-history-row">
          <div class="battle-badges">
            ${battleBadges}
          </div>
          <div class="tooltip-container">
            <div class="tooltip-icon">?</div>
            <div class="tooltip-content">
              <div class="tooltip-title">Demotion Rules</div>
              <table class="demotion-table">
                <thead>
                  <tr>
                    <th>Current Rank</th>
                    <th>Poor Performance (last 5 battles)</th>
                    <th>Demote To</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Recruit</td><td>N/A</td><td>N/A</td></tr>
                  <tr><td>Legionary</td><td>2 Levy battles</td><td>Recruit (or reset to 200)</td></tr>
                  <tr><td>Optio</td><td>2 Levy or 2 Hastatus or (1 Levy + 1 Hastatus)</td><td>Legionary (or reset to 500)</td></tr>
                  <tr><td>Centurion</td><td>ANY Levy or Hastatus OR no Triarius/Imperator in 5 battles</td><td>Optio (or reset to 900)</td></tr>
                  <tr><td>Tribunus</td><td>ANY Levy or Hastatus OR less than 3 Triarius/Imperator</td><td>Centurion (or reset to 1300)</td></tr>
                  <tr><td>Legatus</td><td>N/A</td><td>N/A</td></tr>
                </tbody>
              </table>
              <div style="margin-top:8px; padding:6px; background:rgba(212,175,55,0.15); border:1px solid rgba(212,175,55,0.3); border-radius:4px; font-size:0.65rem; color:#f1c40f;">
                <strong>Safety Net:</strong> If you reach 50% progress in your rank, demotion resets you to the start of your current rank instead of dropping you to the previous rank.
              </div>
            </div>
          </div>
        </div>
        ${warning ? `<div class="warning-message">${warning}</div>` : ''}
      </div>
    `;
  }

  renderMenu() {
    const masterMerit = this.app.legionMerits.master_merit || 0;
    const clubMerit = this.app.legionMerits.lichess_merit || 0;
    const masterLegion = Scoring.getLegionRank(masterMerit);
    const clubLegion = Scoring.getLegionRank(clubMerit);
    const masterBattleHistory = this.renderBattleHistory('master');
    const clubBattleHistory = this.renderBattleHistory('lichess');
    
    const masterSafetyNet = Scoring.getSafetyNetThreshold(masterLegion.title);
    const clubSafetyNet = Scoring.getSafetyNetThreshold(clubLegion.title);
    
    document.getElementById('app').innerHTML = `
      <div class="menu">
        <h1 class="menu-title">LINES OF THE LEGION</h1>
        <p class="menu-subtitle">
         Master opening theory through Roman military ranks
        </p>
        
        <div class="game-description">
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
        
        <div class="menu-home">
          <!-- CAMPAIGNS SECTION -->
          <div class="menu-campaigns">
            <h3 style="color: var(--roman-gold); font-size: 0.9rem; margin-bottom: 0; text-align: center;">Choose Your Campaign</h3>
            
           <button id="masterBtn" class="menu-btn campaign-btn gold-btn">
  <span class="campaign-btn-icon">🏆</span>
  <span class="campaign-btn-label">Master</span>
</button>
            
     <button id="lichessBtn" class="menu-btn campaign-btn silver-btn">
  <span class="campaign-btn-icon">♟️</span>
  <span class="campaign-btn-label">Club</span>
</button>

     <button id="practiceBtn" class="menu-btn campaign-btn bronze-btn">
  <span class="campaign-btn-icon">📖</span>
  <span class="campaign-btn-label">Practice</span>
</button>
            
           <button id="resetBtn" class="menu-btn campaign-btn silver-btn">
  <span class="campaign-btn-icon">↺</span>
  <span class="campaign-btn-label">Reset Progress</span>
</button>
          </div>
          
          <!-- RULES SECTION -->
          <div class="menu-rules">
            <button class="rules-toggle" id="rulesToggle">
              <span>📜 GAME RULES</span>
              <span id="rulesArrow">▼</span>
            </button>
            
            <div id="rulesContent" style="display: none;" class="rules-content">
              <p style="margin-bottom: 10px;">
                Your ultimate aim is to earn 1,750 Merit and ascend to <strong style="color:var(--gold);">Legatus</strong> – the highest rank of the Roman army.
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
                🪖 Levy (0–39) · 🛡️ Hastatus (40–54) · ⚔️ Principes (55–69)<br>
                🦅 Triarius (70–84) · 👑 Imperator (85–100)
              </p>

              <h4>4. LEGION RANKS</h4>
              <p>
                🌱 Recruit (0) → 🛡️ Legionary (200) → ⚔️ Optio (500)<br>
                🦅 Centurion (900) → 🏅 Tribunus (1300) → 🏆 Legatus (1750)
              </p>

              <h4>5. DEMOTION & DISCIPLINE</h4>
              <table>
                <thead>
                  <tr>
                    <th>Current Rank</th>
                    <th>Poor Performance<br>(Last 5 Battles)</th>
                    <th>Demoted To</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Recruit</td>
                    <td style="color:#777;">N/A</td>
                    <td style="color:#777;">N/A</td>
                  </tr>
                  <tr>
                    <td>Legionary</td>
                    <td>2 Levy battles</td>
                    <td>Recruit (or reset to 200 if 350+ merit)</td>
                  </tr>
                  <tr>
                    <td>Optio</td>
                    <td>2 Levy OR<br>2 Hastatus OR<br>1 Levy + 1 Hastatus</td>
                    <td>Legionary (or reset to 500 if 700+ merit)</td>
                  </tr>
                  <tr>
                    <td>Centurion</td>
                    <td>ANY Levy/Hastatus OR<br>No Triarius/Imperator in 5 battles</td>
                    <td>Optio (or reset to 900 if 1100+ merit)</td>
                  </tr>
                  <tr>
                    <td>Tribunus</td>
                    <td>ANY Levy/Hastatus OR<br>Less than 3 Triarius/Imperator</td>
                    <td>Centurion (or reset to 1300 if 1525+ merit)</td>
                  </tr>
                  <tr>
                    <td>Legatus</td>
                    <td style="color:#777;">N/A</td>
                    <td style="color:#777;">N/A</td>
                  </tr>
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
                If you reach 50% progress toward your next rank, demotion resets you to the start of your current rank instead of dropping you to the previous rank.<br>
                <strong>Safety Thresholds:</strong> Legionary (350), Optio (700), Centurion (1100), Tribunus (1525)
              </p>
            </div>
          </div>
        </div>

        ${this.renderFooter()}
      </div>
    `;
    
    // Render auth section as fixed element
    this.renderAuthSection();
    this.bindFooter();
   // document.getElementById('masterBtn').onclick = () => this.app.selectSource('master');
    //document.getElementById('lichessBtn').onclick = () => this.app.selectSource('lichess');
	document.getElementById('masterBtn').onclick = () => {
      if (typeof RomanBattleEffects !== 'undefined') RomanBattleEffects.playMenuFanfare();
      this.app.selectSource('master');
    };

    document.getElementById('lichessBtn').onclick = () => {
      if (typeof RomanBattleEffects !== 'undefined') RomanBattleEffects.playMenuFanfare();
      this.app.selectSource('lichess');
    };

    document.getElementById('practiceBtn').onclick = () => {
      this.app.startPracticePicker();
    };

    document.getElementById('resetBtn').onclick = () => {
      this.app.resetStats();
    };

    
    const rulesToggle = document.getElementById('rulesToggle');
    const rulesContent = document.getElementById('rulesContent');
    const rulesArrow = document.getElementById('rulesArrow');
    
    rulesToggle.onclick = () => {
      const isOpen = rulesContent.style.display === 'block';
      rulesContent.style.display = isOpen ? 'none' : 'block';
      rulesArrow.textContent = isOpen ? '▼' : '▲';
    };
  }

  renderPracticePicker() {
    const grouped = PracticeOpenings.reduce((acc, opening, index) => {
      const group = opening.orientation === 'black' ? 'Black Defense' : 'White Opening';
      if (!acc[group]) acc[group] = [];
      acc[group].push({ ...opening, index });
      return acc;
    }, {});

    const order = ['White Opening', 'Black Defense'];
    const sections = order.map(group => {
      const rows = (grouped[group] || []).map(opening => {
        const source = opening.source || 'base';
        const originalIndex = Number.isFinite(opening.originalIndex) ? opening.originalIndex : opening.index;
        return `
        <tr class="practice-opening-row" onclick="app.startPracticeOpening(PracticeOpenings[${opening.index}])">
          <td class="practice-opening-name">${opening.name}</td>
          <td class="practice-opening-side">${opening.orientation === 'white' ? 'White' : 'Black'}</td>
          <td class="practice-opening-action">
            <button class="practice-opening-remove-btn" onclick="event.stopPropagation(); PracticeOpeningsManager.removeLine('${source}', ${originalIndex});">Remove</button>
          </td>
        </tr>
      `;
      }).join('');

      if (!rows) return '';
      return `
        <div class="practice-category practice-category--${group.toLowerCase().replace(/\s+/g, '-')}">
          <h3>${group}</h3>
          <table class="practice-table">
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    }).join('');

    const isLoading = !PracticeOpeningsManager.isLoaded;
    const emptyMessage = isLoading
      ? 'Loading practice openings…'
      : (PracticeOpenings.length === 0 ? 'No practice lines loaded yet. Add one or upload a CSV.' : '');

    document.getElementById('app').innerHTML = `
      <button class="home-button" onclick="app.goHome()">🏠</button>
      <div class="menu">
        <h1 class="menu-title">Practice Mode</h1>
        <p class="menu-subtitle">Pick an opening and drill the position from a real-game opening book.</p>

        ${emptyMessage ? `<div class="practice-message">${emptyMessage}</div>` : ''}

        ${isLoading ? '' : sections}

        <div class="practice-toolbar practice-toolbar--bottom">
          <button id="practiceAddBtn" class="menu-btn">+ Add Practice Line</button>
          <button id="practiceUploadBtn" class="menu-btn">📂 Upload CSV</button>
          <button id="practiceDownloadBtn" class="menu-btn">💾 Download CSV</button>
        </div>

        <input id="practiceOpeningsUploadInput" type="file" accept=".csv" style="display:none;" />

        <div id="practiceAddModal" class="practice-modal-backdrop" style="display:none;">
          <div class="practice-modal">
            <h2>Add Practice Line</h2>
            <p class="practice-helper">Enter the FEN and choose the orientation for the opening.</p>
            <label for="practiceAddName">Name</label>
            <input id="practiceAddName" type="text" placeholder="Example: Queen's Gambit Declined" />
            <label for="practiceAddFen">FEN</label>
            <input id="practiceAddFen" type="text" placeholder="Example: rnbqkb1r/ppp2ppp/4pn2/3p4/3P1B2/4PN2/PPP2PPP/RN1QKB1R b KQkq - 1 4" />
            <label>Orientation</label>
            <div class="practice-radio-group">
              <label><input type="radio" name="practiceAddOrientation" value="white" checked /> White</label>
              <label><input type="radio" name="practiceAddOrientation" value="black" /> Black</label>
            </div>
            <div class="practice-actions">
              <button id="practiceAddCancelBtn" class="menu-btn">Cancel</button>
              <button id="practiceAddSaveBtn" class="menu-btn">Save</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.renderAuthSection();
    PracticeOpeningsManager.bindPracticePicker();
  }

  renderColorChoice() {
    const masterMerit = this.app.legionMerits.master_merit || 0;
    const clubMerit = this.app.legionMerits.lichess_merit || 0;
    const masterLegion = Scoring.getLegionRank(masterMerit);
    const clubLegion = Scoring.getLegionRank(clubMerit);
    const masterBattleHistory = this.renderBattleHistory('master');
    const clubBattleHistory = this.renderBattleHistory('lichess');
    const masterSafetyNet = Scoring.getSafetyNetThreshold(masterLegion.title);
    const clubSafetyNet = Scoring.getSafetyNetThreshold(clubLegion.title);
    
    const isMaster = this.app.aiSource === 'master';
    const currentMerit = isMaster ? masterMerit : clubMerit;
    const currentLegion = isMaster ? masterLegion : clubLegion;
    const currentBattleHistory = isMaster ? masterBattleHistory : clubBattleHistory;
    const currentSafetyNet = isMaster ? masterSafetyNet : clubSafetyNet;
    const gamesPlayed = isMaster ? this.app.gamesPlayedMaster : this.app.gamesPlayedLichess;
    
    // Calculate progress to next rank
    const currentLevel = currentLegion.level || 0;
    const currentThreshold = currentLegion.thresholds ? currentLegion.thresholds[currentLevel] : 0;
    const nextThreshold = currentLegion.thresholds && currentLevel < currentLegion.rankOrder.length - 1
      ? currentLegion.thresholds[currentLevel + 1]
      : currentThreshold;
    const progressInSegment = currentThreshold === nextThreshold
      ? 100
      : Math.round(((currentMerit - currentThreshold) / (nextThreshold - currentThreshold)) * 100);
    const clampedProgress = Math.min(100, Math.max(0, progressInSegment));
    
    // Generate progress path visualization with medal images
    const rankImageMap = {
      'Recruit': 'Recruit_new.png',
      'Legionary': 'Legionary_new.png',
      'Optio': 'Optio_new.png',
      'Centurion': 'Centurion_new.png',
      'Tribunus': 'Tribunus_new.png',
      'Legatus': 'Legatus_new.png'
    };

    // Rank descriptions shown in the dynamic rank banner below "Start Battle"
    const rankDescriptionMap = {
      'Recruit': {
        label: 'Recruit (Tiro)',
        icon: '🌱',
        text: 'A newly enlisted soldier, still learning the discipline and skills needed to survive the battlefield.'
      },
      'Legionary': {
        label: 'Legionary (Legionarius)',
        icon: '⚔️',
        text: 'A fully trained Roman soldier, forming the backbone of the legion and fighting in the front lines.'
      },
      'Optio': {
        label: 'Optio',
        icon: '🛡️',
        text: 'A trusted veteran chosen to assist a Centurion, leading soldiers and maintaining order in battle.'
      },
      'Centurion': {
        label: 'Centurion',
        icon: '🏛️',
        text: 'A battle-hardened commander who leads a century of soldiers with courage, discipline, and experience.'
      },
      'Tribunus': {
        label: 'Tribunus (Military Tribune)',
        icon: '🦅',
        text: 'A senior officer responsible for strategy, leadership, and overseeing multiple military units.'
      },
      'Legatus': {
        label: 'Legatus',
        icon: '👑',
        text: 'The commander of an entire Roman legion, entrusted with leading thousands of soldiers to victory.'
      }
    };

    const rankFunFactsMap = {
     Recruit: [
    'Roman recruits often trained with wooden swords and wicker shields that were nearly twice the weight of real weapons, making actual combat feel easier.',
    'Every recruit swore the Sacramentum, a sacred oath of loyalty to Rome that could never be broken.',
    'New recruits spent months drilling before they were trusted with real weapons.',
    'Roman recruits learned to march in perfect step—discipline was valued as much as courage.',
    'Recruits spent countless hours practicing the same formations until they could perform them without hesitation.',
    'Before joining a legion, every recruit underwent rigorous physical and endurance training.',
    'A recruit\'s discipline was judged as carefully as his fighting ability.',
    'Roman training camps were designed to prepare soldiers for every kind of terrain and weather.',
    'Many recruits came from distant provinces, united under the banner of Rome.',
    'Training was so demanding that veterans often claimed it was harder than battle itself.'
  ],

  Legionary: [
    'A legionary typically marched 30 km (18–20 miles) a day while carrying equipment weighing around 30–40 kg (65–90 lb).',
    'A legionary carried so much gear they were nicknamed "Marius\' Mules."',
    'Roman soldiers built fortified camps at the end of almost every day\'s march.',
    'A Roman legionary could serve for 25 years before earning retirement and land.',
    'A legionary was expected to fight, build, march, and survive with little outside support.',
    'Each legion had its own name, number, and proud traditions that soldiers fiercely defended.',
    'Legionaries built roads, bridges, forts, and siege engines wherever the army marched.',
    'Roman armor and weapons were regularly maintained—rusty equipment was unacceptable.',
    'Veteran legionaries often mentored new recruits during campaigns.',
    'A disciplined legion could construct an entire fortified camp before sunset.'
  ],

  Optio: [
    'An Optio usually stood behind the formation, keeping soldiers in line and preventing anyone from fleeing the battle.',
    'An Optio earned roughly twice the pay of a regular legionary.',
    'If a Centurion fell in battle, the Optio was expected to take command immediately.',
    'The long staff carried by an Optio helped direct formations and maintain discipline.',
    'An Optio was handpicked by the Centurion for exceptional loyalty and leadership.',
    'Optios memorized battle formations so they could keep units organized under pressure.',
    'The Optio acted as the Centurion\'s most trusted advisor during combat.',
    'Promotion to Optio was earned through merit, not noble birth.',
    'Many future Centurions first proved themselves as Optios.',
    'An Optio was expected to inspire confidence even when battles turned against Rome.'
  ],

  Centurion: [
    'Centurions carried a vine staff (vitis), a symbol of authority that allowed them to discipline soldiers—even experienced veterans.',
    'Centurions were among the highest-paid soldiers in the Roman Army.',
    'Experienced Centurions often led the first charge instead of directing from behind.',
    'A Centurion\'s red transverse helmet crest made him easy to recognize on the battlefield.',
    'Centurions often rose through the ranks after years of distinguished service.',
    'A skilled Centurion could command the loyalty of nearly eighty soldiers.',
    'Centurions were expected to be the first into battle and the last to retreat.',
    'The best Centurions could eventually become the prestigious Primus Pilus, the senior Centurion of a legion.',
    'Centurions enforced Rome\'s famous discipline, which helped make its army one of history\'s greatest.',
    'Battle scars were often worn with pride—they were proof of courage and experience.'
  ],

  Tribunus: [
    'Many future Roman politicians and generals began their public careers as military tribunes.',
    'Most legions had six military tribunes, each helping oversee administration and command.',
    'Young Roman nobles often served as Tribunes before entering public office.',
    'Serving as a Tribune was considered a prestigious step toward becoming a Roman governor or senator.',
    'Military Tribunes helped oversee logistics, training, and the daily operation of an entire legion.',
    'A Tribune often served as the link between senior commanders and frontline officers.',
    'Many Tribunes came from influential Roman families, but still had to earn the respect of their soldiers.',
    'Tribunes frequently inspected camps to ensure discipline and readiness.',
    'Serving as a Tribune provided valuable military experience before higher office.',
    'A capable Tribune balanced strategy, administration, and leadership.'
  ],

  Legatus: [
    'A Legatus commanded 5,000–6,000 legionaries and was appointed directly by the Roman Emperor.',
    'A Legatus commanded the equivalent of a modern military brigade—around 5,000 to 6,000 soldiers.',
    'Legati were appointed directly by the Emperor and usually served for several years.',
    'Some Legati later became governors of Roman provinces after distinguished military service.',
    'A Legatus was entrusted with the lives of thousands of legionaries.',
    'Legati planned campaigns, negotiated with allies, and commanded armies across the Empire.',
    'Only Rome\'s most respected officers were entrusted with leading a legion.',
    'A victorious Legatus could celebrate a triumph and earn lasting fame throughout Rome.',
    'Some Legati commanded campaigns that expanded the borders of the Roman Empire.',
    'A Legatus answered directly to the Emperor or the Senate, depending on the campaign.'
  ]
    };

    const currentRankImage = rankImageMap[currentLegion.title] || 'Legatus_new.png';
    const currentRankInfo = rankDescriptionMap[currentLegion.title] || rankDescriptionMap['Legatus'];
    const currentRankFact = rankFunFactsMap[currentLegion.title]
      ? rankFunFactsMap[currentLegion.title][Math.floor(Math.random() * rankFunFactsMap[currentLegion.title].length)]
      : '';
    
    const pathSteps = currentLegion.rankOrder.map((rank, i) => {
      const isReached = i <= currentLevel;
      const isCurrent = i === currentLevel;
      const threshold = currentLegion.thresholds ? currentLegion.thresholds[i] : 0;
      const imageSrc = rankImageMap[rank] || '';
      return `
        <div class="legion-path-step ${isReached ? 'legion-path-step--reached' : ''} ${isCurrent ? 'legion-path-step--current' : ''}">
          <div class="legion-path-node">
            ${imageSrc ? `<img src="${imageSrc}" alt="${rank}" class="legion-path-medal" onerror="this.style.display='none'; this.parentElement.innerHTML='${rank.substring(0,1)}';"/>` : rank.substring(0, 1)}
          </div>
          <div class="legion-path-label">${rank}</div>
          <div class="legion-path-merit">${threshold}</div>
        </div>
      `;
    }).join('');
    
    document.getElementById('app').innerHTML = `
      <button class="home-button" onclick="app.goHome()">🏠</button>
      
      <div class="menu">
        <!-- Current Legion Status -->
        <div class="legion-card ${isMaster ? 'masters' : 'club'}">
          <div class="legion-header">${isMaster ? '🏆 Masters Legion' : '♟️ Club Legion'}</div>
          <div class="legion-status">
            ${currentLegion.title} (${currentMerit} merit) ${currentLegion.icon}
          </div>
          
          <!-- Road to Legatus Progress -->
          <div style="margin: 8px 0;">
            <div style="font-size: 0.8rem; font-weight: bold; color: var(--roman-gold); margin-bottom: 8px; text-align: center;">Road to Legatus</div>
            
            <!-- Progress Path -->
            <div class="legion-path">
              ${pathSteps}
            </div>
            
            <!-- Progress Bar to Next Rank -->
            ${currentLegion.nextRank ? `
              <div style="margin-top: 10px;">
                <div style="font-size: 0.7rem; color: #aaa; margin-bottom: 4px; text-align: center;">
                  ${currentLegion.title} → ${currentLegion.nextRank}
                </div>
                <div style="background: rgba(0,0,0,0.3); border-radius: 4px; height: 10px; overflow: hidden; border: 1px solid var(--roman-gold);">
                  <div style="background: linear-gradient(90deg, var(--roman-gold), #d4af37); height: 100%; width: ${clampedProgress}%; transition: width 0.3s ease;"></div>
                </div>
                <div style="font-size: 0.65rem; color: #aaa; margin-top: 3px; text-align: center;">
                  ${currentMerit} / ${nextThreshold} merit (${clampedProgress}%)
                </div>
              </div>
            ` : `
              <div style="font-size: 0.7rem; color: var(--roman-gold); text-align: center; margin-top: 6px; font-weight: bold;">✨ Highest rank achieved ✨</div>
            `}
          </div>
          
          ${currentSafetyNet ? `<div class="safety-net-display">🛡️ Demotion Safety Net: ${currentSafetyNet} merit</div>` : ''}
          ${currentBattleHistory}
          <div style="font-size:0.7rem;color:#aaa;margin-top:2px;text-align:center;">
            Battles Fought: ${gamesPlayed}
          </div>
        </div>

        <div style="display:flex; gap:10px; justify-content:center; margin:8px 0;">
          <button id="startBattleBtn" class="menu-btn gold-btn" style="width: auto; padding: 10px 20px; font-size: 0.85rem;">⚔️ Start Battle</button>
        </div>

        <div class="rank-banner" style="display:flex; flex-direction:row; align-items:center; gap:12px; margin:14px 0 4px; padding:10px 12px; background:rgba(0,0,0,0.25); border:1px solid var(--roman-gold); border-radius:10px; box-sizing:border-box;">
          <div class="rank-banner-image-wrap" style="flex:0 0 auto; width:125px; height:125px; border-radius:50%; overflow:hidden; border:2px solid var(--roman-gold); box-shadow:0 4px 14px rgba(0,0,0,0.6);">
            <img src="${currentRankImage}" alt="${currentLegion.title}" class="rank-banner-img" style="width:100%; height:100%; object-fit:cover; object-position:center; display:block;" onerror="this.parentElement.style.display='none';" />
          </div>
          <div class="rank-banner-info" style="flex:1 1 auto; min-width:0; text-align:left;">
            <div class="rank-banner-title" style="font-size:0.63rem; font-weight:bold; color:var(--roman-gold); margin-bottom:4px;">${currentRankInfo.icon} ${currentRankInfo.label}</div>
            <div class="rank-banner-text" style="font-size:0.53rem; color:#ddd; line-height:1.35;">${currentRankInfo.text}</div>
            <div class="rank-fact">
              <div class="rank-fact-title">Did you know?</div>
              <div class="rank-fact-text">${currentRankFact}</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Render auth section as fixed element
    this.renderAuthSection();

    document.getElementById('startBattleBtn').onclick = () => this.app.startBattle();
  }

  renderGameContainer() {
  // Only create if it doesn't exist
  if (document.querySelector('.game-container')) {
    return;
  }
  
  console.log('Creating game container');
  document.getElementById('app').innerHTML = `
    <button class="home-button" onclick="app.goHome()">🏠 Home</button>
    
    <div class="game-container">
      <div class="board-wrapper" id="board"></div>
      <div class="info-line" id="gameCount">Loading position data...</div>
      <div id="endSummary" class="end-summary" style="display:none;"></div>
      <div id="theoryMessage" class="theory-message" style="display:none;"></div>
      <div class="action-buttons">
        <button class="btn gold-btn no-shimmer" onclick="location.reload()">🔄 New Battle</button>
        <button class="btn gold-btn no-shimmer" id="hintBtn">🎖️ Consult Commander</button>
      </div>
    </div>
  `;
  this.renderAuthSection();
  
}

  renderAuthSection() {
    // Remove any existing auth section
    const existingAuth = document.querySelector('.auth-section-fixed');
    if (existingAuth) {
      existingAuth.remove();
    }
    
    // Create new auth section
    const authHtml = this.app.auth.renderAuthSection();
    const authDiv = document.createElement('div');
    authDiv.className = 'auth-section-fixed';
    authDiv.innerHTML = authHtml;

    // Lichess connect button (needed for explorer API auth)
    const lichessDiv = document.createElement('div');
    lichessDiv.id = 'lichess-auth-btn';
    authDiv.appendChild(lichessDiv);

    document.body.appendChild(authDiv);

    // Render button content after it's in the DOM
    if (typeof LichessAuth !== 'undefined') {
      LichessAuth.renderButton('lichess-auth-btn');
    }
  }

  renderBoard() {
    this.renderGameContainer();
    const board = this.app.game.board();
    const isFlipped = this.app.playerColor === 'b';
    const renderedBoard = isFlipped ? board.slice().reverse().map(r => r.slice().reverse()) : board;
    const isPlayerTurn = this.app.game.turn() === this.app.playerColor;

    const countEl = document.getElementById('gameCount');
    if (countEl) {
      countEl.textContent = this.app.gameCount > 0
        ? `Position reached ${this.app.gameCount.toLocaleString()} times`
        : 'Position data unavailable – continuing...';
    }

    const summaryEl = document.getElementById('endSummary');
    if (summaryEl && !this.app.gameEnded) {
      summaryEl.style.display = 'none';
    }
    const theoryEl = document.getElementById('theoryMessage');
    if (theoryEl && !this.app.gameEnded) {
      theoryEl.style.display = 'none';
    }

    const hintBtn = document.getElementById('hintBtn');
    if (hintBtn) {
      const hintEnabled = this.app.mode === 'practice'
        ? !this.app.hintUsed
        : isPlayerTurn && !this.app.hintUsed;
      hintBtn.disabled = !hintEnabled;
      hintBtn.textContent = this.app.hintUsed ? '✓ Consulted' : '🎖️ Consult Commander';
      hintBtn.onclick = hintEnabled ? () => this.app.getHints() : null;
    }

    const boardEl = document.getElementById('board');
    if (!boardEl) return;
    boardEl.innerHTML = '';

    const fragment = document.createDocumentFragment();
    const legalTargets = this.app.selected
      ? new Set(this.app.game.moves({ square: this.app.selected, verbose: true }).map(m => m.to))
      : new Set();

    renderedBoard.forEach((row, r) => {
      row.forEach((square, c) => {
        const actualRow = isFlipped ? 7 - r : r;
        const actualCol = isFlipped ? 7 - c : c;
        const sqName = 'abcdefgh'[actualCol] + (8 - actualRow);
        const isLight = (actualRow + actualCol) % 2 === 0;
        const isSelected = this.app.selected === sqName;
        const isLastMove = this.app.lastMove.from === sqName || this.app.lastMove.to === sqName;
        const isMoveTarget = legalTargets.has(sqName);

        const div = document.createElement('div');
        div.className = `square ${isLight ? 'light' : 'dark'} ${isSelected ? 'selected' : ''} ${isLastMove ? 'last-move' : ''} ${isMoveTarget ? 'move-target' : ''} ${!isPlayerTurn ? 'disabled' : ''}`;
        div.onclick = () => this.app.handleClick(actualRow, actualCol);
        div.onmousedown = e => e.preventDefault();
        div.ondragover = e => {
          if (isPlayerTurn && this.app.dragSource) {
            e.preventDefault();
          }
        };
        div.ondragenter = e => {
          if (isPlayerTurn && this.app.dragSource) {
            e.preventDefault();
            div.classList.add('drag-over');
          }
        };
        div.ondragleave = () => {
          div.classList.remove('drag-over');
        };
        div.ondrop = e => {
          if (!isPlayerTurn || !this.app.dragSource) return;
          e.preventDefault();
          div.classList.remove('drag-over');
          const source = this.app.dragSource;
          this.app.handleDragMove(source, sqName);
        };

        if (square) {
          const img = document.createElement('img');
          img.src = this.app.pieceImages[square.color + square.type];
          img.className = 'piece';
          img.draggable = isPlayerTurn && square.color === this.app.playerColor;
          img.ondragstart = e => {
            if (!isPlayerTurn || square.color !== this.app.playerColor) {
              e.preventDefault();
              return false;
            }
            this.app.dragSource = sqName;
            e.dataTransfer.setData('text/plain', sqName);
            e.dataTransfer.effectAllowed = 'move';
            return true;
          };
          img.ondragend = () => {
            this.app.dragSource = null;
          };
          div.appendChild(img);
        }
        fragment.appendChild(div);
      });
    });

    boardEl.appendChild(fragment);
  }

 renderEndGameSummary(battleRank, moveQuality, displayEval, gamesToShow, isPractice = false) {
  console.log('📊 Rendering end game summary...');
  
  // Check if we need to create the game container
  let summaryEl = document.getElementById('endSummary');
  let msgEl = document.getElementById('theoryMessage');
  
  if (!summaryEl || !msgEl) {
    console.log('⚠️ Elements not found, forcing container recreation...');
    // Force recreate by removing existing container first
    const existingContainer = document.querySelector('.game-container');
    if (existingContainer) {
      existingContainer.remove();
    }
    
    // Now create fresh container (NO home button here)
    document.getElementById('app').innerHTML = `
      <div class="game-container">
        <div class="board-wrapper" id="board"></div>
        <div class="info-line" id="gameCount">Loading position data...</div>
        <div id="endSummary" class="end-summary" style="display:none;"></div>
        <div id="theoryMessage" class="theory-message" style="display:none;"></div>
        <div class="action-buttons" style="display:none;">
          <button class="btn gold-btn no-shimmer" onclick="location.reload()">🔄 New Battle</button>
          <button class="btn gold-btn no-shimmer" id="hintBtn">🎖️ Consult Commander</button>
        </div>
      </div>
    `;
    this.renderAuthSection();
    
    // Get elements again
    summaryEl = document.getElementById('endSummary');
    msgEl = document.getElementById('theoryMessage');
    
    if (!summaryEl || !msgEl) {
      console.error('❌ Still cannot find summary elements after recreation!');
      return;
    }
  }
  
  console.log('✅ Found summary elements, rendering...');

  let rankChangeHtml = this.app.rankChangeMessage
    ? (this.app.rankChangeType === 'promotion'
        ? `<div class="promotion-message">${this.app.rankChangeMessage}</div>`
        : `<div class="demotion-message">${this.app.rankChangeMessage}</div>`)
    : '';
  this.app.rankChangeMessage = null;
  this.app.rankChangeType = null;

  const rankColors = {
    'Levy': '#2ecc71',
    'Hastatus': '#ecf0f1',
    'Principes': '#e74c3c',
    'Triarius': '#3498db',
    'Imperator': '#9b59b6'
  };
  const rankColor = rankColors[battleRank.title] || '#d4af37';

  summaryEl.innerHTML = `
    ${rankChangeHtml}
    <h3 style="color: ${rankColor}; text-shadow: 0 0 20px ${rankColor}; font-size: 0.85rem; margin-bottom: 6px;">${battleRank.icon} ${battleRank.title} • Score: ${battleRank.score}/100</h3>
    <div class="stats-grid" style="gap: 5px; font-size: 0.68rem; margin: 6px 0;">
      <div style="padding: 5px;">Moves<br><strong style="font-size: 0.9rem;">${this.app.playerMoves}</strong></div>
      <div style="padding: 5px;">Book Move<br><strong style="font-size: 0.9rem;">${moveQuality}%</strong></div>
      <div style="padding: 5px;">Eval<br><strong style="font-size: 0.9rem;">${displayEval}</strong></div>
    </div>
    <div style="font-style:italic;color:${rankColor};margin:5px 0;font-size:0.588rem;">Commander says - "${battleRank.msg}"</div>
    <div style="font-size:0.476rem;color:${rankColor};margin:4px 0;"><em>${battleRank.sub}</em></div>
    <div class="rank-progress" style="gap: 3px; margin: 6px 0;">
      ${['Levy', 'Hastatus', 'Principes', 'Triarius', 'Imperator'].map(r => {
        const color = rankColors[r];
        const isActive = r === battleRank.title;
        return `<div class="rank-step ${isActive ? 'active' : ''}" style="padding: 2px 4px; font-size: 0.455rem; ${isActive ? `background: linear-gradient(135deg, ${color}, ${color}); color: ${r === 'Hastatus' ? '#000' : '#fff'}; border-color: ${color};` : ''}">${r}</div>`;
      }).join('')}
    </div>
    
    <div style="margin-top:10px; display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
      ${isPractice ? `
      <button id="tryAgainBtn" class="btn" style="padding: 6px 10px; font-size: 0.7rem;">
        🔄 Try Again
      </button>
      ` : `
      <button id="continueCampaignBtn" class="btn" style="padding: 6px 10px; font-size: 0.7rem;">
        ⚔️ Continue Campaign
      </button>
      `}
      <button id="showAnalysisBtn" class="btn" style="padding: 6px 10px; font-size: 0.7rem;">
        📊 Analyze
      </button>
      <button id="exitBtn" class="btn" style="padding: 6px 10px; font-size: 0.7rem;">
        🚪 Exit
      </button>
    </div>

    <div style="margin-top:10px; color:#d9d9d9; font-size:0.8rem; text-align:center;">
      ${isPractice ? 'Practice games do not affect campaign merit, rank, game history, or PGN export.' : ''}
    </div>

    <div style="margin-top:10px;">
      ${this.renderDonateButtons()}
    </div>
  `;
  summaryEl.style.display = 'block';

  setTimeout(() => {
    const analysisBtn = document.getElementById('showAnalysisBtn');
    const tryAgainBtn = document.getElementById('tryAgainBtn');
    const continueCampaignBtn = document.getElementById('continueCampaignBtn');
    const exitBtn = document.getElementById('exitBtn');
    
    if (analysisBtn) {
      analysisBtn.onclick = () => this.app.showAnalysis();
    }
    
    if (tryAgainBtn) {
      tryAgainBtn.onclick = () => {
        if (isPractice && this.app.practiceOpening) {
          this.app.startPracticeOpening(this.app.practiceOpening);
        } else {
          this.app.startBattle();
        }
      };
    }
    
    if (continueCampaignBtn) {
      continueCampaignBtn.onclick = () => {
        app.renderColorChoice();
      };
    }
    
    if (exitBtn) {
      exitBtn.onclick = () => this.app.goHome();
    }
  }, 100);

  // Show historical games from this position
  if (gamesToShow && gamesToShow.length > 0) {
    let html = `<strong>Historical games from this position:</strong><br>`;
    gamesToShow.forEach((game, idx) => {
      const whitePlayer = game.white?.name || 'Unknown';
      const blackPlayer = game.black?.name || 'Unknown';
      const whiteRating = game.white?.rating || '?';
      const blackRating = game.black?.rating || '?';
      const year = game.year || '';
      const gameId = game.id || '';
      const gameUrl = gameId ? `https://lichess.org/${gameId}` : '#';
      const resultText = game.winner === 'white' ? '1-0' : game.winner === 'black' ? '0-1' : '\u00bd-\u00bd';
      const resultColor = game.winner === 'white' ? '#fff' : game.winner === 'black' ? '#ccc' : '#f1c40f';
      html += `<div class="game-list-item">
        <strong>${idx + 1}.</strong> ${whitePlayer} (${whiteRating}) \u2013 ${blackPlayer} (${blackRating})${year ? `, ${year}` : ''}<br>
        <span style="color:${resultColor};">${resultText}</span> \u2022 <a href="${gameUrl}" target="_blank">View \u2197</a>
      </div>`;
    });
    msgEl.innerHTML = html;
    msgEl.style.display = 'block';
  } else {
    msgEl.innerHTML = '';
    msgEl.style.display = 'none';
  }
}
}