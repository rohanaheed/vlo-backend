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

  @Column({ default: 0 })
  type!: string;

  @Column({ default: 0 })
  description!: string;

  @Column({ default: 0 })
  fileUrl!: string;

  @Column({ type: "simple-array", default: "" })
  sharedWith!: string[];

  @Column({ default: "" })
  createdBy!: string;

  @Column({ default: "" })
  status!: string;

  @Column({ default: "" })
  responses!: object;

  @Column({ default: "" })
  lastLogActivity!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ default: false })
  isDelete!: boolean;
}