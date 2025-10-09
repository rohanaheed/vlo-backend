import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  Index
} from "typeorm";

@Entity()
@Index("idx_sms_performance_campaign_date", ["campaignId", "date"])
@Index("idx_sms_performance_date", ["date"])
export class SMSPerformance {
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

  @Column({ type: "date" })
  date!: Date;

  @Column({ type: "varchar", length: 255 })
  campaignName!: string;

  @Column({ type: "int", default: 0 })
  smsSent!: number;

  @Column({ type: "int", default: 0 })
  delivered!: number;

  @Column({ type: "int", default: 0 })
  failed!: number;

  @Column({ type: "int", default: 0 })
  replies!: number;

  @Column({ type: "int", default: 0 })
  optOuts!: number;

  @Column({ type: "int", default: 0 })
  clicks!: number;

  @Column({ type: "int", default: 0 })
  conversions!: number;

  // Calculated rates
  @Column({ type: "decimal", precision: 5, scale: 2 })
  deliveryRate!: number;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  failureRate!: number;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  replyRate!: number;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  optOutRate!: number;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  clickThroughRate!: number;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  conversionRate!: number;

  // Cost and revenue metrics
  @Column({ type: "decimal", precision: 10, scale: 2, default: 0.00 })
  cost!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0.00 })
  revenue!: number;

  @Column({ default: 0 })
  currencyId!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  costPerSMS!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  costPerDelivery!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  costPerReply!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  costPerConversion!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  revenuePerSMS!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  roi!: number;

  // Geographic and carrier breakdown
  @Column({ type: "json" })
  carrierBreakdown!: any;

  @Column({ type: "json" })
  countryBreakdown!: any;

  @Column({ type: "json" })
  regionBreakdown!: any;

  @Column({ type: "json" })
  timeBreakdown!: any;

  // Message type and content analysis
  @Column({ type: "varchar", length: 100 })
  messageType!: string;

  @Column({ type: "int" })
  messageLength!: number;

  @Column({ type: "json" })
  keywordPerformance!: any;

  @Column({ type: "json" })
  linkPerformance!: any;

  // Error tracking
  @Column({ type: "int", default: 0 })
  invalidNumber!: number;

  @Column({ type: "int", default: 0 })
  blockedNumber!: number;

  @Column({ type: "int", default: 0 })
  spamFiltered!: number;

  @Column({ type: "json" })
  errorBreakdown!: any;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
