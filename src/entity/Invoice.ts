import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
@Entity()
export class Invoice {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  invoiceNumber!: string;

  @Column()
  customerId!: string;

  @Column()
  originalInvoiceNumber!: string;

  @Column()
  invoiceDate!: string;

  @Column()
  dueDate!: string;

  @Column()
  amount!: string;

  @Column()
  status!: string;

  @Column()
  paymentStatus!: string;

  @Column()
  paymentMethod!: string;

  @Column()
  paymentDate!: string;

  @Column()
  isActive!: boolean;

  @Column()
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
