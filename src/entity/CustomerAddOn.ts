import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class CustomerAddOn {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: 0 })
  customerId!: number;

  @Column({ default: 0 })
  packageId!: number;

  @Column({ default: "" })
  module!: string;

  @Column({ default: "" })
  feature!: string;

  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  monthlyPrice!: number;

  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  yearlyPrice!: number;

  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  discount!: number;

  @Column({ default: "" })
  description!: string;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
