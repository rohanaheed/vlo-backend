import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
@Entity()
export class Ticket {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: 0 })
  customerId!: number;

  @Column({ default: "" })
  ticketSubject!: string;

  @Column({ default: "" })
  ticketDescription!: string;

  @Column({ default: "" })
  ticketStatus!: string;

  @Column({ default: "" })
  ticketPriority!: string;

  @Column({ default: "" })
  assignedTo!: string;

  @Column({ type: "timestamp", default: null })
  assignedDate!: Date | null;

  @Column({ type: "timestamp", default: null })
  closedDate!: Date | null;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn({ type: "timestamp" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt!: Date;
}
