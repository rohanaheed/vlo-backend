import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";


@Entity()
export class Currency {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: "" })
  currencyCode!: string;

  @Column({ default: "" })
  currencyName!: string;

  @Column({ default: "" })
  currencySymbol!: string;

  @Column({ type: "decimal", precision: 10, scale: 4, default: 1 })
  exchangeRate!: number;

  @Column({ default: false })
  isCrypto!: boolean;
  
  @Column({ type: "decimal", precision: 10, scale: 4, default: 1 })
  USDPrice!: number;

  @Column({ default: "" })
  country!: string;
  
  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

}