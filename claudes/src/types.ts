export type CampaignFrameType = 'gold' | 'silver' | 'bronze';

export interface CampaignItem {
  title: string;
  subtitle: string;
  image: string;
  frameType: CampaignFrameType;
  action: 'master' | 'lichess' | 'practice';
}

export interface CampaignCardProps {
  title: string;
  subtitle: string;
  image: string;
  frameType: CampaignFrameType;
  onClick: () => void;
}
