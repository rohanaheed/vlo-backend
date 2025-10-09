import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  Index
} from "typeorm";

export type SocialChannelType = "Twitter" | "TikTok" | "YouTube" | "Instagram" | "LinkedIn" | "Facebook" | "Telegram";

@Entity()
@Index("idx_social_performance_campaign_date", ["campaignId", "date"])
@Index("idx_social_performance_channel_date", ["channelType", "date"])
@Index("idx_social_performance_post_id", ["postId"])
export class SocialMediaPerformance {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: 0 })
  campaignId!: number;

  @Column({ default: 0 })
  campaignChannelId!: number;

  @Column({ default: 0 })
  userId!: number;

  @Column({ default: 0 })
  customerId!: number;

  @Column({ 
    type: "enum", 
    enum: ["Twitter", "TikTok", "YouTube", "Instagram", "LinkedIn", "Facebook", "Telegram"]
  })
  channelType!: SocialChannelType;

  @Column({ type: "varchar", length: 255 })
  postId!: string;

  @Column({ type: "varchar", length: 500 })
  postContent!: string;

  @Column({ type: "date" })
  date!: Date;

  // Engagement Metrics
  @Column({ type: "int", default: 0 })
  impressions!: number;

  @Column({ type: "int", default: 0 })
  reach!: number;

  @Column({ type: "int", default: 0 })
  engagements!: number;

  @Column({ type: "int", default: 0 })
  likes!: number;

  @Column({ type: "int", default: 0 })
  comments!: number;

  @Column({ type: "int", default: 0 })
  shares!: number;

  @Column({ type: "int", default: 0 })
  retweets!: number;

  @Column({ type: "int", default: 0 })
  saves!: number;

  @Column({ type: "int", default: 0 })
  views!: number;

  @Column({ type: "int", default: 0 })
  watchTimeMinutes!: number;

  // Follower/Subscriber Metrics
  @Column({ type: "int", default: 0 })
  followersGained!: number;

  @Column({ type: "int", default: 0 })
  subscribersGained!: number;

  @Column({ type: "int", default: 0 })
  connectionsGained!: number;

  @Column({ type: "int", default: 0 })
  pageLikes!: number;

  // Platform-specific metrics
  @Column({ type: "int", default: 0 })
  forwards!: number;

  @Column({ type: "int", default: 0 })
  clicks!: number;

  @Column({ type: "int", default: 0 })
  profileViews!: number;

  @Column({ type: "int", default: 0 })
  websiteClicks!: number;

  // Calculated rates
  @Column({ type: "decimal", precision: 5, scale: 2 })
  engagementRate!: number;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  clickThroughRate!: number;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  reachRate!: number;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  impressionRate!: number;

  // Revenue and conversion metrics
  @Column({ type: "decimal", precision: 10, scale: 2, default: 0.00 })
  revenue!: number;

  @Column({ default: 0 })
  currencyId!: number;

  @Column({ type: "int", default: 0 })
  conversions!: number;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  conversionRate!: number;

  // Demographic and device breakdown
  @Column({ type: "json" })
  demographicBreakdown!: any;

  @Column({ type: "json" })
  deviceBreakdown!: any;

  @Column({ type: "json" })
  locationBreakdown!: any;

  @Column({ type: "json" })
  timeBreakdown!: any;

  @Column({ type: "json" })
  hashtagPerformance!: any;

  @Column({ type: "json" })
  mentionPerformance!: any;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
