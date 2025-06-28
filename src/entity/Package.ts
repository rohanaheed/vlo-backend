import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
@Entity()
export class Package {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  description!: string;

  @Column()
  monthlyPrice!: number;

  @Column()
  annualPrice!: number;

  @Column()
  billingCycle!: number;

  @Column()
  duration!: number;

  @Column()
  maxEmployees!: number;

  @Column()
  maxClients!: number;

  @Column()
  isFree!: boolean;

  @Column()
  isPrivate!: boolean;

  @Column()
  isAutoRenewal!: boolean;

  @Column()
  isActive!: boolean;

  @Column()
  monthlyStatus!: string;

  @Column()
  annualStatus!: string;

  @Column()
  moduleInPackage!: string;

  @Column()
  isDefault!: boolean;

  @Column()
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
