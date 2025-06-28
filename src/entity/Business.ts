import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";


@Entity()
export class Business {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  businessName!: string;

  @Column()
  tradingName!: string;

  @Column()
  businessAddress!: string;

  @Column()
  businessType!: string;

  @Column()
  businessSize!: number;

  @Column()
  businessEntity!: string;

  @Column()
  status!: string;

  @Column()
  domainType!: string;

  @Column()
  website!: string;

  @Column()
  subdomain!: string;

  @Column()
  currency!: string;

  @Column()
  language!: string;

  @Column()
  timezone!: string;

  @Column()
  subscriptionType!: string;

  @Column()
  businessStatistics!: string;

  @Column()
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
