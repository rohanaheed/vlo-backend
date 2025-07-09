import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Invoice } from "./Invioce";
import { User } from "./User";

@Entity()
export class InvoiceHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: 0 })
  invoiceId!: number;

  @Column({ default: "" })
  changedBy!: string;

  @Column({ default: "" })
  changedByEmail!: string;

  @Column({ type: "timestamp" })
  changeDate!: Date;

  @Column({ type: "text", nullable: true })
  notes?: string;

  @Column({ type: "text", nullable: true })
  previousValue?: string;

  @Column({ type: "text", nullable: true })
  newValue?: string;
}
