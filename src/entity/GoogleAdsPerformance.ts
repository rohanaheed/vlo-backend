import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  Index
} from "typeorm";

@Entity()
@Index("idx_google_ads_performance_campaign_date", ["campaignId", "date"])
@Index("idx_google_ads_performance_ad_group_date", ["adGroupName", "date"])
@Index("idx_google_ads_performance_date", ["date"])
export class GoogleAdsPerformance {
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

  @Column({ type: "varchar", length: 255 })
  campaignName!: string;

  @Column({ type: "varchar", length: 255 })
  adGroupName!: string;

  @Column({ type: "varchar", length: 255 })
  adId!: string;

  @Column({ type: "varchar", length: 255 })
  keyword!: string;

  @Column({ type: "date" })
  date!: Date;

  // Core performance metrics
  @Column({ type: "int", default: 0 })
  impressions!: number;

  @Column({ type: "int", default: 0 })
  clicks!: number;

  @Column({ type: "int", default: 0 })
  conversions!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0.00 })
  cost!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0.00 })
  revenue!: number;

  @Column({ default: 0 })
  currencyId!: number;

  // Calculated metrics
  @Column({ type: "decimal", precision: 5, scale: 2 })
  ctr!: number; // Click-through rate

  @Column({ type: "decimal", precision: 10, scale: 2 })
  cpc!: number; // Cost per click

  @Column({ type: "decimal", precision: 10, scale: 2 })
  cpm!: number; // Cost per mille (1000 impressions)

  @Column({ type: "decimal", precision: 10, scale: 2 })
  cpa!: number; // Cost per acquisition/conversion

  @Column({ type: "decimal", precision: 5, scale: 2 })
  conversionRate!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  roas!: number; // Return on ad spend

  @Column({ type: "decimal", precision: 10, scale: 2 })
  roi!: number; // Return on investment

  // Quality metrics
  @Column({ type: "decimal", precision: 3, scale: 2 })
  qualityScore!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  avgCpc!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  avgPosition!: number;

  @Column({ type: "int", default: 0 })
  searchImpressions!: number;

  @Column({ type: "int", default: 0 })
  searchClicks!: number;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  searchCtr!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  searchCost!: number;

  // Display network metrics
  @Column({ type: "int", default: 0 })
  displayImpressions!: number;

  @Column({ type: "int", default: 0 })
  displayClicks!: number;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  displayCtr!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  displayCost!: number;

  // Video metrics (for YouTube ads)
  @Column({ type: "int", default: 0 })
  videoViews!: number;

  @Column({ type: "int", default: 0 })
  videoClicks!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  videoViewRate!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  videoCost!: number;

  // Shopping metrics (for Shopping campaigns)
  @Column({ type: "int", default: 0 })
  shoppingImpressions!: number;

  @Column({ type: "int", default: 0 })
  shoppingClicks!: number;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  shoppingCtr!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  shoppingCost!: number;

  // Audience and demographic breakdown
  @Column({ type: "json" })
  ageGroupBreakdown!: any;

  @Column({ type: "json" })
  genderBreakdown!: any;

  @Column({ type: "json" })
  locationBreakdown!: any;

  @Column({ type: "json" })
  deviceBreakdown!: any;

  @Column({ type: "json" })
  timeBreakdown!: any;

  @Column({ type: "json" })
  interestBreakdown!: any;

  @Column({ type: "json" })
  remarketingBreakdown!: any;

  // Campaign type and bidding
  @Column({ type: "varchar", length: 100 })
  campaignType!: string;

  @Column({ type: "varchar", length: 100 })
  biddingStrategy!: string;

  @Column({ type: "varchar", length: 100 })
  networkType!: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  budget!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  dailyBudget!: number;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
