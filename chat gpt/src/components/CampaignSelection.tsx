import { CampaignCard } from './CampaignCard';
import styles from './CampaignSelection.module.css';
import type { CampaignItem } from '../types';

function createArtwork(frameType: CampaignItem['frameType']) {
  const palette =
    frameType === 'silver'
      ? { sky: '#2d3a41', field: '#6c5d45', stone: '#b7b0a4', accent: '#e7e1d0' }
      : frameType === 'bronze'
        ? { sky: '#3b2520', field: '#5f4d31', stone: '#7e5c3b', accent: '#d8b27b' }
        : { sky: '#362315', field: '#6b532d', stone: '#b6964f', accent: '#f4d170' };

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 960">
      <rect width="640" height="960" fill="#0d0a07" />
      <rect y="700" width="640" height="260" fill="${palette.field}" />
      <rect y="0" width="640" height="360" fill="${palette.sky}" />
      <rect x="80" y="120" width="480" height="220" fill="#13110d" opacity="0.88" />
      <rect x="100" y="140" width="440" height="180" fill="#1d1915" opacity="0.95" />
      <path d="M120 420 L250 300 L340 355 L520 240 L620 300 L620 700 L120 700 Z" fill="#2b2216" opacity="0.86" />
      <path d="M92 700 L260 430 L356 482 L520 300 L560 344 L560 700 Z" fill="#4b3420" opacity="0.92" />
      <rect x="120" y="720" width="120" height="90" fill="${palette.stone}" opacity="0.95" />
      <rect x="260" y="732" width="180" height="78" fill="#2c2419" opacity="0.95" />
      <rect x="460" y="722" width="70" height="92" fill="${palette.stone}" opacity="0.95" />
      <circle cx="470" cy="180" r="92" fill="${palette.accent}" opacity="0.15" />
      <rect x="430" y="236" width="92" height="176" fill="#1b160f" opacity="0.9" />
      <rect x="444" y="248" width="64" height="150" fill="${palette.accent}" opacity="0.25" />
      <path d="M255 220 L310 160 L360 220 L330 220 L330 308 L280 308 L280 220 Z" fill="${palette.accent}" opacity="0.75" />
      <path d="M308 142 L332 110 L357 142" stroke="${palette.accent}" stroke-width="12" fill="none" stroke-linecap="round" />
      <path d="M166 560 Q223 514 276 560 T390 566 T520 544" stroke="${palette.accent}" stroke-width="12" fill="none" opacity="0.4" />
      <path d="M82 812 L158 770 L216 812 L154 900 Z" fill="#1a140f" opacity="0.95" />
      <path d="M424 838 L478 782 L548 838 L492 900 Z" fill="#1a140f" opacity="0.95" />
      <path d="M178 842 h286" stroke="#1a140f" stroke-width="10" stroke-linecap="round" />
      <circle cx="154" cy="742" r="6" fill="${palette.accent}" opacity="0.8" />
      <circle cx="490" cy="700" r="8" fill="${palette.accent}" opacity="0.6" />
      <circle cx="320" cy="640" r="7" fill="${palette.accent}" opacity="0.7" />
      <path d="M218 108 L228 82 L244 108" stroke="#111" stroke-width="8" fill="none" />
      <path d="M418 106 L428 80 L444 106" stroke="#111" stroke-width="8" fill="none" />
    </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

interface CampaignSelectionProps {
  onSelectCampaign: (source: 'master' | 'lichess' | 'practice') => void;
}

export function CampaignSelection({ onSelectCampaign }: CampaignSelectionProps) {
  const campaigns: CampaignItem[] = [
    {
      title: 'MASTER',
      subtitle: 'Master Campaign',
      image: createArtwork('gold'),
      frameType: 'gold',
      action: 'master',
    },
    {
      title: 'CLUB',
      subtitle: 'Club Campaign',
      image: createArtwork('silver'),
      frameType: 'silver',
      action: 'lichess',
    },
    {
      title: 'PRACTICE',
      subtitle: 'Practice Mode',
      image: createArtwork('bronze'),
      frameType: 'bronze',
      action: 'practice',
    },
  ];

  return (
    <section className={styles.shell} aria-labelledby="campaign-title">
      <div className={styles.ambient} aria-hidden="true" />
      <div className={styles.panel}>
        <p className={styles.kicker}>Roman Command Center</p>
        <h1 id="campaign-title" className={styles.title}>LINES OF THE LEGION</h1>
        <p className={styles.subtitle}>Master opening theory through Roman military ranks</p>
        <p className={styles.heading}>Choose Your Campaign</p>
        <p className={styles.description}>
          Enter the battlefield where chess mastery meets Roman military glory. Every move you make is judged against the greatest games in history. Will you rise through the ranks from humble <strong>Recruit</strong> to legendary <strong>Legatus</strong>?
        </p>
        <p className={styles.descriptionSecondary}>
          Each battle tests your knowledge of opening theory. Play moves that match the masters, maintain strong positions, and prove your tactical prowess. Earn merit through discipline and excellence, but beware—poor performance leads to demotion and disgrace.
        </p>
        <p className={styles.descriptionTertiary}>
          Choose your campaign and step onto the field of glory. <em>Veni, vidi, vici!</em>
        </p>

        <div className={styles.grid}>
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.title}
              title={campaign.title}
              subtitle={campaign.subtitle}
              image={campaign.image}
              frameType={campaign.frameType}
              onClick={() => onSelectCampaign(campaign.action)}
            />
          ))}
        </div>

        <p className={styles.caption}>Step into the war hall, select your campaign, and march toward glory.</p>
      </div>
    </section>
  );
}

export default CampaignSelection;
