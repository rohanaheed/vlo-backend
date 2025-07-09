import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";


@Entity()
export class BankAccounts {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: "" })
  bankName!: string;

  @Column({ default: "" })
  accountNumber!: string;

  @Column({ default: "" })
  accountName!: string;

  @Column({ default: "" })
  accountType!: string;

  @Column({ default: "" })
  bankCode!: string;

  @Column({ default: 0 })
  customerId!: number;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
