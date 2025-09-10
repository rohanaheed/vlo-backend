import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { BillingCycle } from "./Package";

@Entity()
export class PackageModule {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: "" })
  name!: string;

  @Column("json", { nullable: true })
  includedFeatures!: { name: string; price?: number, isEnabled?: boolean, billingCycle?: BillingCycle }[];

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}