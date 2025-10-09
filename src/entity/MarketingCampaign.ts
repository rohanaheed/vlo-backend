import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn
} from "typeorm";

export type CampaignType = "Email" | "SMS" | "Social Media" | "Google Ads" | "WhatsApp" | "Telegram";
export type CampaignStatus = "Draft" | "Active" | "Paused" | "Completed" | "Cancelled";

@Entity()
export class MarketingCampaign {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: 0 })
  userId!: number;

  @Column({ default: 0 })
  businessId!: number;

  @Column({ default: 0 })
  customerId!: number;

  @Column({ type: "varchar", length: 255 })
  campaignName!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({ 
    type: "enum", 
    enum: ["Email", "SMS", "Social Media", "Google Ads", "WhatsApp", "Telegram"],
    default: "Email"
  })
  campaignType!: CampaignType;

  @Column({ type: "datetime" })
  startDate!: Date;

  @Column({ type: "datetime" })
  endDate!: Date;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0.00 })
  budget!: number;

  @Column({ default: 0 })
  currencyId!: number;

  @Column({ default: 0 })
  packageId!: number;

  @Column({ default: 0 })
  subscriptionId!: number;

  @Column({ default: 0 })
  orderId!: number;

  @Column({ default: 0 })
  transactionId!: number;

  @Column({ 
    type: "enum", 
    enum: ["Draft", "Active", "Paused", "Completed", "Cancelled"],
    default: "Draft"
  })
  status!: CampaignStatus;

  @Column({ type: "text" })
  audienceTargeting!: string;

  @Column({ type: "text" })
  content!: string;

  @Column({ type: "varchar", length: 255 })
  subjectLine!: string;

  @Column({ type: "json" })
  scheduleConfig!: any;

  @Column({ type: "json" })
  campaignSettings!: any;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
