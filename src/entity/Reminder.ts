import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Reminder {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: "" })
  title!: string;

  @Column("text", { default: "" })
  content!: string;

  @Column({ default: 0 })
  customerId!: number;

  @Column({ type: "datetime", nullable: true })
  dueDate!: Date | null;

  @Column({ default: "pending" })
  status!: string;

  @Column({ default: "email" })
  type!: string;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
