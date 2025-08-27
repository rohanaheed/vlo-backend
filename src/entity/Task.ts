import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
@Entity()
export class Task {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: "" })
  name!: string;

  @Column({ default: "" })
  workflowStage!: string;

  @Column("simple-array", { default: [] })
  assignee!: number[];

  @Column({ type: "timestamp", default: null })
  dueDate!: Date | null;
  
  @Column({ default: "" })
  status!: string;

  @Column({ default: "" })
  priority!: string;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
