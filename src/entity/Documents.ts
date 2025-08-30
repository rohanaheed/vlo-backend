import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";


@Entity()
export class Document {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: 0 })
  customerId!: number;

  @Column({ default: 0 })
  userId!: number;

  @Column({ default: 0 })
  matterId!: number;

  @Column({ default: "" })
  title!: string;

  @Column({ default: "" })
  type!: string;

  @Column({ default: "" })
  description!: string;

  @Column({ default: "" })
  fileUrl!: string;

  @Column({ type: "simple-array", nullable: true })
  sharedWith!: string[];

  @Column({ default: "" })
  createdBy!: string;

  @Column({ default: "" })
  status!: string;

  @Column({ type: "json", nullable: true })
  responses!: Record<string, any>;

  @Column({ default: "" })
  lastLogActivity!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ default: false })
  isDelete!: boolean;
}