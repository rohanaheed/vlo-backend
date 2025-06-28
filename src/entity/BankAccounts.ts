import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";


@Entity()
export class BankAccounts {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  bankName!: string;

  @Column()
  accountNumber!: string;

  @Column()
  accountName!: string;

  @Column()
  accountType!: string;

  @Column()
  bankCode!: string;

  @Column()
  customerId!: number;

  @Column()
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
