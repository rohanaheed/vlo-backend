import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";


@Entity()
export class Business {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: "" })
  businessName!: string;

  @Column({ default: "" })
  tradingName!: string;

  @Column({ default: "" })
  businessAddress!: string;

  @Column({ default: "" })
  businessType!: string;

  @Column({ default: 0 })
  businessSize!: number;

  @Column({ default: "" })
  businessEntity!: string;

  @Column({ default: "active" })
  status!: string;

  @Column({ default: "" })
  domainType!: string;

  @Column({ default: "" })
  website!: string;

  @Column({ default: "" })
  subdomain!: string;

  @Column({ default: "" })
  currency!: string;

  @Column({ default: "en" })
  language!: string;

  @Column({ default: "UTC" })
  timezone!: string;

  @Column({ default: "free" })
  subscriptionType!: string;

  @Column({ default: "" })
  businessStatistics!: string;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
