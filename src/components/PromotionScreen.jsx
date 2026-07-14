import React, { useEffect, useState } from 'react';
import './PromotionScreen.css';
import { Button } from './Button';

const DUTIES = {
  Legionary: {
    title: 'Legionary',
    duties: [
      'Maintain accurate opening play.',
      'Strengthen your understanding of common variations.',
      'Stay composed when the position becomes unfamiliar.',
      'Earn merit through disciplined decision-making.'
    ],
    quote: 'A Legionary wins through consistency, not chance.'
  },
  Optio: {
    title: 'Optio',
    duties: [
      'Recognize tactical opportunities within opening theory.',
      'Recover confidently from unfamiliar positions.',
      'Understand the purpose behind each move.',
      'Demonstrate reliability in every campaign.'
    ],
    quote: 'Leadership begins with understanding, not authority.'
  },
  Centurion: {
    title: 'Centurion',
    duties: [
      'Master complex opening structures.',
      'Punish inaccuracies with confidence.',
      'Maintain composure under pressure.',
      'Lead by precision rather than aggression.'
    ],
    quote: 'A Centurion earns respect through unwavering discipline.'
  },
  Tribunus: {
    title: 'Tribunus',
    duties: [
      'Think strategically across the entire opening.',
      'Adapt to unfamiliar variations without losing direction.',
      'Demonstrate consistency against stronger opposition.',
      "Uphold the standards expected of Rome's senior officers."
    ],
    quote: 'Wisdom guides where strength alone cannot.'
  },
  Legatus: {
    title: 'Legatus',
    duties: [
      'Demonstrate complete mastery of opening theory.',
      'Choose the strongest plans with confidence.',
      'Adapt calmly to every battlefield.',
      'Inspire excellence through flawless play.'
    ],
    quote: 'Victory belongs to the commander who understands both battle and strategy.'
  }
};

function rankImagePath(rankName) {
  // public assets under /ranks
  const key = rankName ? rankName.toLowerCase() : 'legionary';
  return `/ranks/${key}.png`;
}

export default function PromotionScreen({ commanderName = 'COMMANDER VALERIUS', prevRank = 'Recruit', newRank = 'Legionary', onContinue, onExit }) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [showRankSwap, setShowRankSwap] = useState(false);

  const speechLines = [
    `By order of Rome, ${commanderName}, attend the ceremony.`,
    `Your skill in the field and discipline in the opening have been noted.`,
    `Stand proud — you shall rise in rank.`,
    `Receive the honours of ${newRank}.`
  ];

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
  }, []);

  const duty = DUTIES[newRank] || DUTIES.Legionary;

  return (
    <div className="promotion-screen" role="dialog" aria-modal="true">
      <div className="promotion-screen__backdrop" />
      <div className="promotion-screen__panel">
        <h1 className="promotion-screen__title">PROMOTION CEREMONY</h1>

        <div className="promotion-screen__commander">
          <img
            className="promotion-screen__commander-portrait"
            src={'/commandar.png'}
            alt="Commander"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/roman.png'; }}
          />
          <div className="promotion-screen__commander-name">{commanderName}</div>
        </div>

        <div className="promotion-screen__speech">
          {speechLines.map((l, idx) => (
            <div key={idx} className={`promotion-screen__speech-line ${visibleLines > idx ? 'visible' : ''}`}>{l}</div>
          ))}
        </div>

        <div className="promotion-screen__ranks">
          <div className={`promotion-screen__rank prev ${showRankSwap ? 'swap-out' : ''}`}>
            <img src={rankImagePath(prevRank)} alt={prevRank} />
            <div className="promotion-screen__rank-label">{prevRank}</div>
          </div>

          <div className={`promotion-screen__rank new ${showRankSwap ? 'swap-in' : ''}`}>
            <img src={rankImagePath(newRank)} alt={newRank} />
            <div className="promotion-screen__rank-label">PROMOTED<br />{newRank}</div>
          </div>
        </div>

        <section className="promotion-screen__duties">
          <h2>YOUR NEW DUTIES</h2>
          <div className="promotion-screen__duty-list">
            {duty.duties.map((d, i) => (
              <div key={i} className="promotion-screen__duty-item">• {d}</div>
            ))}
          </div>
          <blockquote className="promotion-screen__quote">{duty.quote}</blockquote>
        </section>

        <div className="promotion-screen__actions">
          <Button variant="danger" size="md" onClick={onContinue}>Continue campaign</Button>
          <Button variant="ghost" size="md" onClick={onExit}>Exit</Button>
        </div>
      </div>
    </div>
  );
}
