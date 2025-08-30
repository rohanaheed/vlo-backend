import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";


@Entity()
export class Invoice {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: "" })
  invoiceNumber!: string;

  @Column({ default: 0 })
  amount!: number;

  @Column({
    type: "enum",
    enum: ["draft", "sent", "unsent", "paid", "overdue", "cancelled", "partialyPaid", "disputed", "reminder", "resend", "void", "viewed", "unpaid", "bad"],
    default: "draft"
  })
  status!: string;

  @Column({ default: "unpaid" })
  paymentStatus!: string;

  @Column({ default: "" })
  plan!: string;

  @Column({ default: 0 })
  customerId!: number;

  @Column({ default: 0 })
  userId!: number;

  @Column({ default: 0 })
  currencyId!: number;

  @Column({ default: 0 })
  orderId!: number;

  @Column({ type: "timestamp", nullable: true })
  dueDate!: Date;

  @Column({ type: "timestamp", nullable: true })
  markedBadOn!: Date;

  @Column({ default: "" })
  referenceNumber!: string;

  @Column({ default: "" })
  priority!: string;

  @Column({ default: 0 })
  discount!: number;

  @Column({ default: 0 })
  vat!: number;

  @Column({ default: "" })
  discountType!: string;

  @Column({ default: 0 })
  subTotal!: number;

  @Column({ default: 0 })
  outstandingBalance!: number;

  @Column({ default: "" })
  recurring!: string;

  @Column({ default: "" })
  recurringInterval!: string;

  @Column({ default: 0 })
  recurringCount!: number;

  @Column({ default: "" })
  invoiceFile!: string;
  
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ default: false })
  isDelete!: boolean;
  
}