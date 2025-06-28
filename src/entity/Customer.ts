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

  @Column()
  userId!: number;

  @Column()
  logo!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column()
  businessName!: string;

  @Column()
  tradingName!: string;

  @Column()
  subscription!: string;

  @Column()
  note!: string;

  @Column()
  businessSize!: number;

  @Column()
  businessEntity!: string;

  @Column()
  businessType!: string;

  @Column()
  businessAddress!: string;

  @Column()
  phoneNumber!: string;

  @Column()
  email!: string;

  @Column()
  password!: string;

  @Column("simple-array")
  practiceArea!: string[];

  @Column({ type: "enum", enum: ["Active" , "Trial" , "License Expired" , "Free"], default: "Free" })
  status!: Status;

  @CreateDateColumn()
  expirayDate!: string;

  @Column()
  packageId!: number;

  @Column()
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

}
