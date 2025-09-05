import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

export type SubscriptionType = "Free" | "Trial" | "Public Limited Company";

@Entity()
export class Subscription {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: "" })
  name!: string;

  @Column({ default: "" })
  description!: string;

  @Column({ type: "enum", enum: ["Free" , "Trial" , "Public Limited Company"], default: "Free" })
  type!: SubscriptionType;

  @Column({ default: 0 })
  seat!: number

  @Column({ default: 0 })
  maxEmployees!: number;

  @Column({ default: 0 })
  storageSize!: number

  @Column({ default: "" })
  storageUnit!: string

  @Column({ default: false })
  isPrivate!: boolean;

  @Column({ default: false })
  isRecommended!: boolean;

  @Column({ default: "" })
  currency!: string

  @Column({ default: 0 })
  monthlyPrice!: number;

  @Column({ default: 0 })
  annualPrice!: number;

  @Column({default: 0})
  discount!: number

  @Column({default: 0})
  trialPeriod!: number

  @Column({ default: 0 })
  notificationBeforeDays!: number

  @Column({ default: 0 })
  trialMessage!: number

  @Column({ default: "" })
  status!: string

  @Column("json", { nullable: true })
  includedFeatures!: { name: string; isEnabled?: boolean }[];

  @Column("json", { nullable: true })
  includedIntegration!: { name: string; isEnabled?: boolean }[];

  @Column("json", { nullable: true })
  extraAddOn!: { module: string; feature?: string, monthlyPrice?: number, yearlyPrice?:number, discount?:number, description?: string }[];

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
