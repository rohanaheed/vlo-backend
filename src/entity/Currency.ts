import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";


@Entity()
export class Currency {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: 0 })
  customerId!: number;

  @Column({ default: "" })
  currencyCode!: string;

  @Column({ default: "" })
  currencyName!: string;

  @Column({ default: "" })
  currencySymbol!: string;

  @Column({ default: 1 })
  exchangeRate!: number;

  @Column({ default: false })
  isCrypto!: boolean;

  @Column({ default: 0 })
  USDPrice!: number;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

}