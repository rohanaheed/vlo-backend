import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Invoice } from "./Invioce";

@Entity()
export class Installment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column("decimal", { precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: "date" })
  dueDate!: Date;

  @Column({ default: "unpaid" })
  status!: string;

  @Column({ type: "date", nullable: true })
  paidDate!: Date | null;

  @Column({ default: 0 })
  invoiceId!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
