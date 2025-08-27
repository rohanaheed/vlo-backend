import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
@Entity()
export class HeadsUp {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: "" })
  name!: string;

  @Column({ default: "" })
  module!: string;

  @Column({ default: false })
  enabled!: boolean;

  @Column({ default: "" })
  rule!: string;

  @Column({ default: "" })
  frequency!: string;

  @Column({ default: "" })
  timeOfDay!: string;

  @Column({ default: "" })
  timeZone!: string;

  @Column({ default: "active" })
  status!: string;

  @Column({ type: "timestamp" })
  nextRunDate!: Date;

  @Column({ type: "timestamp" })
  lastRunDate!: Date;

  @Column({ default: 0 })
  rowsInEmail!: number;

  @Column({ default: "" })
  contentType!: string;

  @Column({ default: "" })
  resultsGrouped!: string;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn({ type: "timestamp" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt!: Date;
}
