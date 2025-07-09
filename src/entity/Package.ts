import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
@Entity()
export class Package {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: "" })
  name!: string;

  @Column({ default: "" })
  description!: string;

  @Column({ default: 0 })
  monthlyPrice!: number;

  @Column({ default: 0 })
  annualPrice!: number;

  @Column({ default: 1 })
  billingCycle!: number;

  @Column({ default: 1 })
  duration!: number;

  @Column({ default: 0 })
  maxEmployees!: number;

  @Column({ default: 0 })
  maxClients!: number;

  @Column({ default: false })
  isFree!: boolean;

  @Column({ default: false })
  isPrivate!: boolean;

  @Column({ default: false })
  isAutoRenewal!: boolean;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: "active" })
  monthlyStatus!: string;

  @Column({ default: "active" })
  annualStatus!: string;

  @Column({ default: "" })
  moduleInPackage!: string;

  @Column({ default: false })
  isDefault!: boolean;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
