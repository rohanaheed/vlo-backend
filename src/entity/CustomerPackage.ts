import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class CustomerPackage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: 0 })
  customerId!: number;

  @Column({ default: 0 })
  packageId!: number;

  @Column("json", { nullable: true })
  addOns! : { module?: string, feature?: string, monthlyPrice?: number, yearlyPrice?: number, discount?: number, description?: string, stripeProductId?: string | null, stripeMonthlyPriceId?: string | null, stripeYearlyPriceId?: string | null, stripeCouponId?: string | null  }[];

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
