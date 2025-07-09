import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";


@Entity()
export class CreditNotes {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: "" })
  creditNoteNumber!: string;

  @Column({ default: 0 })
  amount!: number;

  @Column({ default: 0 })
  customerId!: number;

  @Column({ default: 0 })
  invoiceId!: number;

  @Column({ default: 0 })
  currencyId!: number;

  @Column({
    type: "enum",
    enum: ["draft", "sent", "paid", "overdue", "cancelled", "partialyPaid", "disputed", "reminder", "resend", "void", "viewed", "unpaid"],
    default: "draft"
  })
  status!: string;

  @Column({ default: "" })
  description!: string;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ default: "" })
  transactionMode!: string;

  @Column({ default: "" })
  referenceNumber!: string;

  @Column({ default: "" })
  bankAccount!: string;
}