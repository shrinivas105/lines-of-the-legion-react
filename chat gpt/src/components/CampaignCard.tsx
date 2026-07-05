import styles from './CampaignCard.module.css';
import type { CampaignCardProps } from '../types';

export function CampaignCard({ title, subtitle, image, frameType, onClick }: CampaignCardProps) {
  const frameClass = frameType === 'silver' ? styles.silver : frameType === 'bronze' ? styles.bronze : styles.gold;

  return (
    <button type="button" className={`${styles.card} ${frameClass}`} onClick={onClick} aria-label={`${title} campaign`}>
      <span className={styles.frameGlow} aria-hidden="true" />
      <span className={styles.edge} aria-hidden="true" />
      <div className={styles.imageShell}>
        <img src={image} alt="" className={styles.image} />
        <div className={styles.imageOverlay} aria-hidden="true" />
      </div>

      <div className={styles.content}>
        <p className={styles.title}>{title}</p>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>
    </button>
  );
}

export default CampaignCard;
