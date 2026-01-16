import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

export type SubscriptionStatus = "inactive" | "active" | "past_due" | "expired" | "cancelled";

@Entity()
export class Subscription {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  customerPackageId!: number;

  @Column()
  customerId!: number;

  @Column()
  currencyId!: number;

  @Column({ type: "timestamp" })
  startDate!: Date;

  @Column({ type: "timestamp" })
  endDate!: Date;

  @Column({
    type: "enum",
    enum: ["inactive", "active", "past_due", "expired", "cancelled"],
    default: "inactive",
  })
  status!: SubscriptionStatus;

  @Column({ default: false })
  autoRenew!: boolean;

  @Column({ nullable: true })
  subscriptionId?: string;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}