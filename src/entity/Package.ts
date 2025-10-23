import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

export type BillingCycle = "Monthly" | "Annual";
export type SubscriptionType = "Paid" | "Free" | "Trial" | "Public Limited Company";
@Entity()
export class Package {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: "" })
  name!: string;

  @Column({ default: 0 })
  currencyId!: number;

  @Column({ type: "enum", enum: ["Paid", "Free", "Trial", "Public Limited Company"] })
  type!: SubscriptionType;

  @Column({ default: "" })
  description!: string;

  @Column({ default: 0 })
  seats!: number;

  @Column({ default: 0 })
  maxEmployee!: number;

  @Column({ default: 0 })
  storageSize!: number;

  @Column({ default: "" })
  storageUnit!: string;

  @Column({ })
  isPrivate!: boolean;

  @Column({ })
  isRecommended!: boolean;

  @Column({ })
  priceMonthly!: number;

  @Column({ })
  priceYearly!: number;

  @Column({ })
  discount!: number;

  @Column({ })
  trialPeriod!: number;

  @Column({ })
  trialMessage!: string;

  @Column({ })
  notificationBeforeDays!: number;

  @Column({})
  status!: number;

  @Column({ type: "enum", enum: ["Monthly", "Annual"], default: "Monthly" })
  billingCycle!: BillingCycle;

  @Column({ default: true })
  isActive!: boolean;

  @Column("json", { nullable: true })
  includedFeatures!: { name: string; isEnabled?: boolean }[];

  @Column("json", { nullable: true })
  integrations!: { name: string; isEnabled?: boolean }[];

  @Column("json", { nullable: true })
  communicationTools!: { name: string; isEnabled?: boolean }[];

  @Column("json", { nullable: true })
  cloudStorage!: { name: string; isEnabled?: boolean }[];

  @Column("json", { nullable: true })
  socialMediaConnectors!: { name: string; isEnabled?: boolean }[];

  @Column("json", { nullable: true })
  extraAddOn!: { module: string; feature?: string, monthlyPrice?: number, yearlyPrice?: number, discount?: number, description?: string }[];

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
