import styles from './CampaignCard.module.css';
import type { CampaignCardProps } from '../types';

export function CampaignCard({ title, image, frameType, onClick }: CampaignCardProps) {
  const frameClass = frameType === 'silver' ? styles.silver : frameType === 'bronze' ? styles.bronze : styles.gold;

  return (
    <button type="button" className={`${styles.card} ${frameClass}`} onClick={onClick} aria-label={`${title} campaign`}>
      <span className={styles.frameGlow} aria-hidden="true" />
      <div className={styles.imageShell}>
        <img src={image} alt={`${title} campaign artwork`} className={styles.image} />
        <div className={styles.imageOverlay} aria-hidden="true" />
      </div>
    </button>
  );
}

export default CampaignCard;
