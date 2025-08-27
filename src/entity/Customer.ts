import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from "typeorm";

export type Status = "Active" | "Trial" | "License Expired" | "Free";


@Entity()
export class Customer {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: 0 })
  userId!: number;

  @Column({ default: "" })
  logo!: string;

  @Column({ default: "" })
  firstName!: string;

  @Column({ default: "" })
  lastName!: string;

  @Column({ default: "" })
  businessName!: string;

  @Column({ default: "" })
  tradingName!: string;

  @Column({ default: "" })
  subscription!: string;

  @Column({ default: "" })
  note!: string;

  @Column({ default: 0 })
  businessSize!: number;

  @Column({ default: "" })
  businessEntity!: string;

  @Column({ default: "" })
  businessType!: string;

  @Column({ default: "" })
  businessAddress!: string;

  @Column({ default: "" })
  phoneNumber!: string;

  @Column({ default: "" })
  email!: string;

  @Column({ default: "" })
  password!: string;

  @Column("simple-array", { default: "" })
  practiceArea!: string[];

  @Column({ type: "enum", enum: ["Active", "Trial", "License Expired", "Free"], default: "Free" })
  status!: Status;

  @CreateDateColumn()
  expiryDate!: Date;

  @CreateDateColumn()
  deletedAt!: Date;

  @CreateDateColumn()
  reasonForDeletion!: string;

  @Column({ default: 0 })
  packageId!: number;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

}
