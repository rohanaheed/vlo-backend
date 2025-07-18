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
  supervisor!: string;

  @Column({ default: "" })
  issueDate!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ default: false })
  isDelete!: boolean;

}