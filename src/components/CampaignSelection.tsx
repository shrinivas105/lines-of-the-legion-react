import { CampaignCard } from './CampaignCard';
import styles from './CampaignSelection.module.css';
import type { CampaignItem } from '../types';
import masterCardArt from '../assets/campaign-cards/master-card.webp';
import clubCardArt from '../assets/campaign-cards/club-card.webp';
import practiceCardArt from '../assets/campaign-cards/practice-card.webp';

interface CampaignSelectionProps {
  onSelectCampaign: (source: 'master' | 'lichess' | 'practice') => void;
}

export function CampaignSelection({ onSelectCampaign }: CampaignSelectionProps) {
  const campaigns: CampaignItem[] = [
    {
      title: 'MASTER',
      subtitle: 'Master Campaign',
      image: masterCardArt,
      frameType: 'gold',
      action: 'master',
    },
    {
      title: 'CLUB',
      subtitle: 'Club Campaign',
      image: clubCardArt,
      frameType: 'silver',
      action: 'lichess',
    },
    {
      title: 'PRACTICE',
      subtitle: 'Practice Mode',
      image: practiceCardArt,
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
