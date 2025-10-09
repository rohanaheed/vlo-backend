import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn
} from "typeorm";

export type ChannelType = 
  | "Email" 
  | "Twitter" 
  | "TikTok" 
  | "YouTube" 
  | "WhatsApp" 
  | "SMS" 
  | "Instagram" 
  | "LinkedIn" 
  | "Facebook" 
  | "Telegram" 
  | "Google Ads";

@Entity()
export class CampaignChannel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: 0 })
  campaignId!: number;

  @Column({ 
    type: "enum", 
    enum: [
      "Email", "Twitter", "TikTok", "YouTube", "WhatsApp", 
      "SMS", "Instagram", "LinkedIn", "Facebook", "Telegram", "Google Ads"
    ]
  })
  channelType!: ChannelType;

  @Column({ type: "json" })
  channelConfig!: any;

  @Column({ type: "varchar", length: 255 })
  accountId!: string;

  @Column({ type: "varchar", length: 255 })
  apiKey!: string;

  @Column({ type: "json" })
  targetingParameters!: any;

  @Column({ type: "json" })
  channelSettings!: any;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
