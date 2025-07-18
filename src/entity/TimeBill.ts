import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";


@Entity()
export class TimeBill {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: 0 })
  customerId!: number;

  @Column({ default: "" })
  matterId!: number;

  @Column({ default: 0 })
  entryId!: number;

  @Column({ default: "" })
  caseWorker!: string;

  @Column({ default: "" })
  matter!: string;

  @Column({ default: "" })
  costDescription!: string;

  @Column({ default: "" })
  unit!: string;

  @Column({ default: "" })
  duration!: string;

  @Column({ default: "" })
  hourlyRate!: string;

  @Column({ default: "" })
  activity!: string;

  @Column({ default: "" })
  type!: string;

  @Column({ default: "" })
  category!: string;

  @Column({ default: "" })
  subCategory!: string;

  @Column({ default: "" })
  dateOfWork!: Date;

  @Column({ default: "" })
  status!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ default: false })
  isDelete!: boolean;
}