import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

export type SubscriptionType = "Free" | "Trial" | "Public Limited Company";

@Entity()
export class Subscription {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  packageId!: number;

  @Column()
  customerId!: number;
  
  @Column({default: false})
  autoRenew!: boolean;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
