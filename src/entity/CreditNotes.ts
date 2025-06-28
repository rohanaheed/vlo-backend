import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";


@Entity()
export class CreditNotes {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  creditNoteNumber!: string;

  @Column()
  amount!: number;

  @Column()
  customerId!: number;

  @Column()
  invoiceId!: number;

  @Column({
    type: "enum",
    enum: ["draft", "sent", "paid", "overdue", "cancelled", "partialyPaid", "disputed", "reminder", "resend", "void", "viewed", "unpaid"]
  })
  status!: string;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column()
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
  
}