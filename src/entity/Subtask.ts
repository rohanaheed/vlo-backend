import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
@Entity()
export class Subtask {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: 0 })
  taskId!: number;

  @Column({ default: "" })
  name!: string;

  @Column({ default: "" })
  assignee!: string;

  @Column({ type: "timestamp", nullable: true })
  dueDate!: Date | null;

  @Column({ default: "" })
  status!: string;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn({ type: "timestamp" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt!: Date;
}
