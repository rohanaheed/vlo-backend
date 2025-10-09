import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  Index
} from "typeorm";

export type LeadSource = "Website" | "Referral" | "Email Campaign" | "Social Media" | "Google Ads" | "Cold Call" | "Trade Show" | "Other";
export type LeadStatus = "New" | "Contacted" | "Qualified" | "Unqualified" | "Converted" | "Lost";

@Entity()
@Index("idx_lead_email", ["email"])
@Index("idx_lead_phone", ["phoneNumber"])
@Index("idx_lead_status", ["status"])
@Index("idx_lead_source", ["leadSource"])
export class Lead {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: 0 })
  userId!: number;

  @Column({ default: 0 })
  businessId!: number;

  @Column({ default: 0 })
  customerId!: number;

  @Column({ default: 0 })
  campaignId!: number;

  @Column({ default: 0 })
  campaignChannelId!: number;

  @Column({ default: 0 })
  emailCampaignId!: number;

  @Column({ default: 0 })
  socialPostId!: number;

  @Column({ default: 0 })
  smsCampaignId!: number;

  @Column({ default: 0 })
  googleAdsId!: number;

  @Column({ type: "varchar", length: 255 })
  leadName!: string;

  @Column({ type: "varchar", length: 255 })
  email!: string;

  @Column({ type: "varchar", length: 50 })
  phoneNumber!: string;

  @Column({ type: "varchar", length: 255 })
  company!: string;

  @Column({ type: "varchar", length: 255 })
  jobTitle!: string;

  @Column({ 
    type: "enum", 
    enum: ["Website", "Referral", "Email Campaign", "Social Media", "Google Ads", "Cold Call", "Trade Show", "Other"],
    default: "Website"
  })
  leadSource!: LeadSource;

  @Column({ 
    type: "enum", 
    enum: ["New", "Contacted", "Qualified", "Unqualified", "Converted", "Lost"],
    default: "New"
  })
  status!: LeadStatus;

  @Column({ type: "text" })
  notes!: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  estimatedValue!: number;

  @Column({ type: "json" })
  customFields!: any;

  @Column({ type: "varchar", length: 255 })
  website!: string;

  @Column({ type: "varchar", length: 255 })
  linkedinUrl!: string;

  @Column({ type: "varchar", length: 255 })
  twitterHandle!: string;

  @Column({ type: "text" })
  address!: string;

  @Column({ type: "varchar", length: 100 })
  city!: string;

  @Column({ type: "varchar", length: 100 })
  state!: string;

  @Column({ type: "varchar", length: 100 })
  country!: string;

  @Column({ type: "varchar", length: 20 })
  postalCode!: string;

  @Column({ type: "datetime" })
  lastContacted!: Date;

  @Column({ type: "datetime" })
  convertedAt!: Date;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
