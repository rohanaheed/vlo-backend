import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "cancelled"

@Entity()
export class Invoice {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: "" })
  invoiceNumber!: string;

  @Column({
    type: "enum",
    enum: ["draft", "sent", "unsent", "paid", "overdue", "cancelled", "partialyPaid", "disputed", "reminder", "resend", "void", "viewed", "unpaid", "bad"],
    default: "draft"
  })
  status!: string;

  @Column({ type: "enum", enum: ["pending", "paid", "failed", "refunded", "cancelled"], default: "pending" })
  paymentStatus!: PaymentStatus;

  @Column({ default: "", nullable: true })
  plan!: string;

  @Column({ type: "json", nullable: true })
  items!: {
    description?: string,
    quantity?: number,
    amount?: number,
    vatRate?: string,
    vatType?: string,
    subTotal?: number,
    discount?: number,
    discountType?: string
  }[];

  @Column({ default: 0 })
  customerId!: number;

  @Column({ default: "" })
  matterId!: string;

  @Column({ default: "", nullable: true })
  customerName!: string;

  @Column({ default: "", nullable: true })
  customerEmail!: string;

  @Column({ default: "", nullable: true })
  clientAddress!: string;

  @Column({ default: "", nullable: true })
  caseDescription!: string;

  @Column({ default: 0 })
  userId!: number;

  @Column({ default: 0 })
  currencyId!: number;

  @Column({ default: 0 , nullable: true})
  orderId!: number;

  @Column({ type: "timestamp", nullable: true })
  dueDate!: Date;

  @Column({ type: "timestamp", nullable: true })
  IssueDate!: Date;

  @Column({ type: "timestamp", nullable: true })
  markedBadOn!: Date;

  @Column({ default: "" , nullable:true})
  referenceNumber!: string;

  @Column({ default: "" })
  priority!: string;

  @Column({  default: false })
  isDiscount!: boolean;

  @Column({ type: "decimal", precision: 10, scale: 4, default: 0 })
  vat!: number;

  @Column({ default: "" })
  discountType!: string;

  @Column({ type: "decimal", precision: 10, scale: 4, default: 0 })
  discountValue!: number;

  @Column({ type: "decimal", precision: 10, scale: 4, default: 0 })
  subTotal!: number;

  @Column({ type: "decimal", precision: 10, scale: 4, default: 0 })
  total!: number;

  @Column({ type: "decimal", precision: 10, scale: 4, default: 0 })
  outstandingBalance!: number;

  @Column({ type: "decimal", precision: 10, scale: 4, default: 0 })
  amount!: number;

  @Column({ default: "" })
  recurring!: string;

  @Column({ default: "" })
  recurringInterval!: string;

  @Column({ default: 0 })
  recurringCount!: number;

  @Column({ type:"json", nullable: true })
  invoiceFile!: string[] | null;

  @Column({ default: 0 })
  bankAccountId!: number;

  @Column({ type: "text", nullable: true })
  notes!: string;

  @Column({ type: "timestamp", nullable: true })
  paidDate!: Date;

  @Column({ default: false })
  isPaidBy!: boolean;

  @Column({ default: 0 })
  financialStatementId!: number;

  @Column({ default: false })
  includeFinancialStatement!: boolean;

  @Column({ default: false })
  includeRegulatoryInfo!: boolean;

  @Column({ type: "timestamp", nullable: true })
  scheduledDate!: Date;

  @Column({ default: false })
  isScheduled!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ default: false })
  isDelete!: boolean;

}