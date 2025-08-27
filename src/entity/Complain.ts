import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
@Entity()
export class Complain {
  @PrimaryGeneratedColumn()
  id!: number;


  @Column({ default: 0 })
  customerId!: number;

  @Column({ default: "" })
  complainSubject!: string;

  @Column({ default: "" })
  complainType!: string;

  @Column({ default: "" })
  complainDescription!: string;

  @Column({ default: "" })
  complainStatus!: string;

  @Column({ default: "" })
  complainPriority!: string;

  @Column({ default: "" })
  complainDate!: string;

  @Column({ default: "" })
  complainTime!: string;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
