import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  Index
} from "typeorm";

@Entity()
@Index("idx_email_performance_campaign_date", ["campaignId", "date"])
@Index("idx_email_performance_date", ["date"])
export class EmailPerformance {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: 0 })
  campaignId!: number;

  @Column({ default: 0})
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
  emailsSent!: number;

  @Column({ type: "int", default: 0 })
  totalOpened!: number;

  @Column({ type: "int", default: 0 })
  totalClicked!: number;

  @Column({ type: "int", default: 0 })
  totalBounced!: number;

  @Column({ type: "int", default: 0 })
  totalUnsubscribed!: number;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  openRate!: number;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  clickRate!: number;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  bounceRate!: number;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  unsubscribeRate!: number;

  @Column({ type: "int", default: 0 })
  uniqueOpens!: number;

  @Column({ type: "int", default: 0 })
  uniqueClicks!: number;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  uniqueOpenRate!: number;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  uniqueClickRate!: number;

  @Column({ type: "int", default: 0 })
  spamComplaints!: number;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  spamComplaintRate!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0.00 })
  revenue!: number;

  @Column({ default: 0 })
  currencyId!: number;

  @Column({ type: "int", default: 0 })
  conversions!: number;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  conversionRate!: number;

  @Column({ type: "json" })
  deviceBreakdown!: any;

  @Column({ type: "json" })
  locationBreakdown!: any;

  @Column({ type: "json" })
  timeBreakdown!: any;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
