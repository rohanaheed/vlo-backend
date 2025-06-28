import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";


@Entity()
export class Invoice {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  invoiceNumber!: string;

  @Column()
  amount!: number;

  @Column({
    type: "enum",
    enum: ["draft", "sent", "paid", "overdue", "cancelled", "partialyPaid", "disputed", "reminder", "resend", "void", "viewed", "unpaid"]
  })
  status!: string;

  @Column()
  paymentStatus!: string;

  @Column()
  plan!: string;

  @Column()
  customerId!: number;

  @Column()
  createdAt!: Date;

  @Column()
  updatedAt!: Date;

  @Column()
  isDelete!: boolean;
  
}