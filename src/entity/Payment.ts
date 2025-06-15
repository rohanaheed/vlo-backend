import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
@Entity()
export class Payment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  paymentMethod!: string;

  @Column()
  customerId!: string;

  @Column()
  name!: string;

  @Column()
  amount!: number;

  @Column()
  transactionId!: string;

  @Column()
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
