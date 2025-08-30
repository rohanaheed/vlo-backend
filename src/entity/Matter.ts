import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";


@Entity()
export class Matter {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: 0 })
  customerId!: number;

  @Column({ default: ""})
  description!: string;

  @Column({ default: 0 })
  fee!: number;

  @Column({ default: "" })
  caseWorker!: string;

  @Column({ default: "" })
  status!: string;

  @Column({ type: "json", nullable: true })
  participants!: Record<string, any>;

  @Column({ default: "" })
  supervisor!: string;

  @Column({ type: "timestamp" })
  issueDate!: Date;

  @Column({ type: "timestamp" })
  startDate!: Date;

  @Column({ type: "timestamp" })
  closeDate!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ default: false })
  isDelete!: boolean;

}