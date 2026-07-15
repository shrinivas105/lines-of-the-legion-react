import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './PromotionScreen.css';
import { Button } from './Button';
import { LEGION_RANK_PORTRAITS } from './rankColors';
import romanFallbackImg from '../roman.png';

// Historically-grounded promotion content for every Legion rank.
// - displayTitle: the full historical title shown to the player (differs
//   from the internal game rank key for Tribunus -> "Tribunus Militum").
// - speechVariants: several short Commander's Address scripts per rank,
//   one chosen at random per ceremony so repeated promotions don't feel
//   like the same cutscene playing back.
// - rewards: tangible, historically plausible equipment/decorations/
//   privileges for the rank — no invented or fantastical items.
// - duties: the chess-strategy responsibilities tied to the new rank.
// - historicalNote: brief real-world grounding for why the rewards and
//   duties fit the actual Roman military hierarchy.
const RANK_CONTENT = {
  Legionary: {
    displayTitle: 'Legionary',
    speechVariants: [
      [
        'By order of Rome, {name}, you stand before this century a recruit no longer.',
        'You have marched, you have drilled, and you have held formation when lesser men broke.',
        'Rome does not reward hope — she rewards discipline. Yours has been noted.',
        'Rise, Legionary. The eagle marches with you now.'
      ],
      [
        '{name}, the training yard has taught you what soft words cannot.',
        'Your shield stayed locked. Your line did not waver. Rome takes note of such men.',
        'A recruit dies in his first battle. A Legionary lives to see the next.',
        'Take up your gladius. You are one of us now.'
      ],
      [
        'Attend, {name} — the centurions have spoken well of you.',
        'You entered this legion untested. You leave the recruit\u2019s tent a soldier of Rome.',
        'Discipline over chaos. Formation over glory. This is the Legionary\u2019s creed.',
        'Wear the eagle\u2019s mark with pride.'
      ]
    ],
    rewards: [
      { name: 'Gladius Hispaniensis', why: 'Primary sidearm, issued only once basic training is complete.' },
      { name: 'Pugio', why: 'Reserve dagger carried at the belt, a mark of a fully equipped soldier.' },
      { name: 'Scutum with legion insignia', why: 'Shield bearing your legion\u2019s own emblem, in place of a bare training shield.' },
      { name: 'Pilum', why: 'Armor-piercing javelin thrown before the charge; standard legionary issue.' },
      { name: 'Lorica Hamata', why: 'Chainmail armor granted to line infantry for its flexibility and protection.' },
      { name: 'Montefortino helmet', why: 'Bronze battle helmet worn by Rome\u2019s rank-and-file infantry.' }
    ],
    duties: [
      'Hold the line — maintain solid structure before advancing.',
      'Protect allied pieces before seeking exchanges.',
      'Stay composed when the position becomes unfamiliar.',
      'Earn merit through disciplined, consistent decision-making.'
    ],
    historicalNote: 'Completing training earned a Roman soldier his full kit — sword, shield, armor, and pay — transforming an untested recruit into a legionary of the line.'
  },
  Optio: {
    displayTitle: 'Optio',
    speechVariants: [
      [
        '{name}, a centurion cannot be everywhere at once.',
        'He needs a second — one who watches the rear rank and holds it firm when men waver.',
        'You have shown judgment where others showed only obedience.',
        'Rise, Optio. Double pay, and a soldier\u2019s trust, are yours to keep.'
      ],
      [
        'The centurion has chosen you himself, {name}.',
        'An Optio does not lead from glory — he leads from the back, where the line is truly tested.',
        'You kept formation when others broke ranks. That is worth more than courage alone.',
        'Take your place as second-in-command. Rome pays double for men like you.'
      ],
      [
        '{name}, step forward — the century has need of you.',
        'Where the centurion cannot see, the Optio must. You have proven you can be trusted with that duty.',
        'A duplicarius earns his wage twice over, and you have earned yours.',
        'Serve well as second, and a vine staff may yet be yours.'
      ]
    ],
    rewards: [
      { name: 'Increased pay (duplicarius)', why: 'Optiones were paid double the standard legionary wage.' },
      { name: 'Phalerae', why: 'Disc-shaped decorations worn on a harness, awarded for proven valor.' },
      { name: 'Armillae', why: 'Ornamental arm bracelets given as military decorations for distinguished service.' },
      { name: 'Lorica Squamata', why: 'Scale armor sometimes issued to officers, a step up in status from mail.' },
      { name: 'Imperial Gallic helmet', why: 'A pattern with added face and neck protection, befitting an officer.' },
      { name: 'Personal servant (calo)', why: 'A camp attendant assigned to assist with equipment and baggage.' }
    ],
    duties: [
      'Recognize tactical opportunities within opening theory.',
      'Protect allied pieces and hold the second rank under pressure.',
      'Recover confidently from unfamiliar positions.',
      'Demonstrate reliability in every campaign.'
    ],
    historicalNote: 'The Optio, meaning \u201cchosen one,\u201d was hand-picked by his centurion as second-in-command, earning double pay for the added trust placed upon him.'
  },
  Centurion: {
    displayTitle: 'Centurion',
    speechVariants: [
      [
        '{name}, few men rise to command a century. Fewer still deserve it.',
        'You have led when leadership was costly, and held firm when the line could have broken.',
        'The vitis is not given lightly — it has struck cowards and steadied brave men alike.',
        'Take it, Centurion. Eighty men now march at your word.'
      ],
      [
        'Rome does not make centurions of soldiers. She makes them of leaders, {name}.',
        'Your century has watched you under pressure, and found nothing wanting.',
        'Wear the transverse crest with pride — it marks you apart on any battlefield.',
        'Command well. Rome watches her officers as closely as her enemies.'
      ],
      [
        '{name}, step forward and take the vine staff of command.',
        'A Centurion leads from the front rank, not the rear — that has always been Rome\u2019s way.',
        'You have earned the respect of men who do not give it easily.',
        'Lead with precision. Discipline, not fear, is the mark of a true centurion.'
      ]
    ],
    rewards: [
      { name: 'Vitis (vine staff)', why: 'The defining symbol of centurion rank — badge of office and instrument of discipline.' },
      { name: 'Musculata cuirass', why: 'Ceremonial muscle-form armor marking a proven, senior officer.' },
      { name: 'Transverse-crested helmet', why: 'Horsehair crest worn crosswise, identifying a centurion instantly in battle.' },
      { name: 'Torc', why: 'Twisted metal neck ornament awarded for exceptional battlefield bravery.' },
      { name: 'Officer\u2019s cloak', why: 'A distinct cloak setting centurions visibly apart from the ranks they command.' },
      { name: 'Greatly increased pay', why: 'Centurions earned many times a legionary\u2019s wage.' }
    ],
    duties: [
      'Defend key files, diagonals, and ranks as your own ground.',
      'Coordinate attacks between your pieces rather than acting alone.',
      'Punish inaccuracies with confidence and precision.',
      'Lead by precision rather than aggression.'
    ],
    historicalNote: 'Centurions were the backbone of the Roman army\u2019s command structure — battle-hardened professionals who led from the front and were paid and decorated accordingly.'
  },
  Tribunus: {
    displayTitle: 'Tribunus Militum',
    speechVariants: [
      [
        '{name}, the Legatus himself has requested you for his staff.',
        'A Tribune does not win battles with his own blade — he wins them before they are fought.',
        'You have shown the strategic mind Rome demands of her senior officers.',
        'Mount your horse, Tribunus. The legion\u2019s fortunes now rest partly on your judgment.'
      ],
      [
        'Few are called to serve as Tribunus Militum, {name}. Fewer still are ready.',
        'You must now think beyond your own century — beyond even your own cohort.',
        'The whole legion\u2019s movement may one day depend on your counsel.',
        'Take your cloak and your horse. Rome asks more of you now, not less.'
      ],
      [
        '{name}, the Senate itself takes interest in officers of your calibre.',
        'A Tribune walks between the soldier\u2019s world and the statesman\u2019s — trusted in both.',
        'You have shown you can adapt your plans as swiftly as the battlefield changes.',
        'Wear the paludamentum. Command awaits those who earn it.'
      ]
    ],
    rewards: [
      { name: 'Paludamentum', why: 'The scarlet military cloak reserved for senior officers, visible across the field.' },
      { name: 'Musculata cuirass', why: 'Ceremonial armor projecting the authority of senior command.' },
      { name: 'Signet ring', why: 'Used to seal official orders issued in the legion\u2019s name.' },
      { name: 'Personal horse', why: 'Tribunes commanded from horseback, granted a mount befitting their station.' },
      { name: 'Officer\u2019s quarters', why: 'Private quarters within camp, apart from the common soldiers\u2019 tents.' },
      { name: 'Audience with senior command', why: 'Direct access to the Legatus when matters of strategy are decided.' }
    ],
    duties: [
      'Organize combined assaults across multiple sectors of the board.',
      'Anticipate enemy strategy several moves in advance.',
      'Preserve elite pieces for decisive moments rather than trading them early.',
      'Balance offense and defense across the entire position.'
    ],
    historicalNote: 'Tribuni Militum were typically men of equestrian or senatorial rank serving as senior staff officers — trusted with strategy and logistics beyond a single century.'
  },
  Legatus: {
    displayTitle: 'Legatus',
    speechVariants: [
      [
        '{name}, there is no rank above this but the will of Rome herself.',
        'You now command the legion entire — every cohort, every century, every soldier\u2019s fate.',
        'The Senate has heard of your campaigns. Soon, so will history.',
        'Take up the paludamentum, Legatus. The eagle marches at your command alone.'
      ],
      [
        'A Legatus is chosen by the Senate, {name}, not merely earned in battle.',
        'You have commanded with a mind that sees the whole war, not just the next skirmish.',
        'Ten cohorts. Thousands of men. All now answer to your judgment.',
        'Rome does not forget the men who lead her legions to lasting victory.'
      ],
      [
        '{name}, few soldiers ever stand where you stand today.',
        'From recruit to Legatus — a road walked by only the most disciplined of men.',
        'History remembers the commanders who understood both the sword and the strategy behind it.',
        'Command well. An empire\u2019s fortunes may yet rest on your decisions.'
      ]
    ],
    rewards: [
      { name: 'Paludamentum', why: 'The unmistakable mark of supreme field command, worn by no rank beneath a Legatus.' },
      { name: 'Musculata cuirass', why: 'Ornate ceremonial armor befitting the legion\u2019s supreme commander.' },
      { name: 'Corona Aurea', why: 'A rare gold crown awarded for extraordinary acts of valor and leadership.' },
      { name: 'Signet ring', why: 'The seal of a man empowered to issue orders in the legion\u2019s name.' },
      { name: 'Land grant upon retirement', why: 'A senator\u2019s reward for a lifetime of loyal, successful command.' },
      { name: 'Audience with the Senate', why: 'The highest honor — a Legatus\u2019s counsel sought directly by Rome\u2019s leadership.' }
    ],
    duties: [
      'Command the entire battlefield with complete strategic oversight.',
      'Choose the strongest plans and commit to them with confidence.',
      'Adapt calmly to every position, however unfamiliar.',
      'Inspire excellence through consistently flawless play.'
    ],
    historicalNote: 'The Legatus Legionis held senatorial rank and answered only to the provincial governor or the Emperor himself — the pinnacle of Roman military command.'
  }
};

function rankImagePath(rankName) {
  // Same artwork RankBadge already uses for the Career Progression circles —
  // reusing it here instead of inventing a separate naming convention.
  return LEGION_RANK_PORTRAITS[rankName] || LEGION_RANK_PORTRAITS.Legionary;
}

export default function PromotionScreen({ commanderName = 'COMMANDER VALERIUS', prevRank = 'Recruit', newRank = 'Legionary', onContinue, onExit }) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [showRankSwap, setShowRankSwap] = useState(false);

  const content = RANK_CONTENT[newRank] || RANK_CONTENT.Legionary;

  // Pick one Commander's Address variant at random, once per ceremony —
  // keeps repeated promotions from feeling like the same cutscene replaying.
  const [speechLines] = useState(() => {
    const variants = content.speechVariants;
    const chosen = variants[Math.floor(Math.random() * variants.length)];
    return chosen.map(line => line.replace('{name}', commanderName));
  });

  useEffect(() => {
    let i = 0;
    const handle = setInterval(() => {
      i += 1;
      setVisibleLines(i);
      if (i >= speechLines.length) {
        clearInterval(handle);
        // after speech, trigger rank swap animation
        setTimeout(() => setShowRankSwap(true), 700);
      }
    }, 900);
    return () => clearInterval(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lock background scroll while this full-screen modal is open, restoring
  // whatever the previous value was on unmount (in case something else in
  // the app also manages body overflow).
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  return createPortal(
    <div className="promotion-screen" role="dialog" aria-modal="true" aria-labelledby="promotion-screen-title">
      <div className="promotion-screen__backdrop" />
      <div className="promotion-screen__panel">
        <h1 id="promotion-screen-title" className="promotion-screen__title">PROMOTION CEREMONY</h1>

        <div className="promotion-screen__commander">
          <img
            className="promotion-screen__commander-portrait"
            src={'/commandar.png'}
            alt="Commander"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = romanFallbackImg; }}
          />
          <div className="promotion-screen__commander-name">{commanderName}</div>
        </div>

        <div className="promotion-screen__speech">
          {speechLines.map((l, idx) => (
            <div key={idx} className={`promotion-screen__speech-line ${visibleLines > idx ? 'visible' : ''}`}>{l}</div>
          ))}
        </div>

        <div className="promotion-screen__ranks">
          <div className="promotion-screen__rank-copy">
            <div className="promotion-screen__rank-banner">Promotion to</div>
            <div className="promotion-screen__rank-name">{content.displayTitle}</div>
            <div className="promotion-screen__rank-subtitle">An honour befitting your battlefield mastery.</div>
          </div>

          <div className="promotion-screen__rank-preview">
            <div className={`promotion-screen__rank prev ${showRankSwap ? 'swap-out' : ''}`}>
              <img
                src={rankImagePath(prevRank)}
                alt={prevRank}
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = romanFallbackImg; }}
              />
            </div>

            <div className={`promotion-screen__rank new ${showRankSwap ? 'swap-in' : ''}`}>
              <img
                src={rankImagePath(newRank)}
                alt={newRank}
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = romanFallbackImg; }}
              />
            </div>
          </div>
        </div>

        <section className="promotion-screen__rewards">
          <h2>Spoils of Rank</h2>
          <div className="promotion-screen__reward-list">
            {content.rewards.map((r, i) => (
              <div key={i} className="promotion-screen__reward-card">
                <div className="promotion-screen__reward-name">{r.name}</div>
                <p>{r.why}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="promotion-screen__duties">
          <h2>Your New Duties</h2>
          <div className="promotion-screen__duty-list">
            {content.duties.map((d, i) => (
              <div key={i} className="promotion-screen__duty-card">
                <div className="promotion-screen__duty-number">{i + 1}</div>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="promotion-screen__historical-note">
          <strong>Historically speaking:</strong> {content.historicalNote}
        </div>

        <div className="promotion-screen__actions">
          <Button variant="danger" size="md" onClick={onContinue}>Continue campaign</Button>
          <Button variant="ghost" size="md" onClick={onExit}>Exit</Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
