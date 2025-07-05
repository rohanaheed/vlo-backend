import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";


@Entity()
export class Currency {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  customerId!: number;

  @Column()
  currencyCode!: string;

  @Column()
  currencyName!: string;

  @Column()
  currencySymbol!: string;

  @Column()
  exchangeRate!: number;

  @Column()
  isCrypto!: boolean;

  @Column()
  USDPrice!: number;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column()
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

}