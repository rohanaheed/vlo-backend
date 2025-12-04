import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from "typeorm";

export type Status = "Active" | "Trial" | "License Expired" | "Free";

@Index("idx_customer_stage_fulltext", ["stage"], { fulltext: true })
@Index("idx_customer_churnRisk_fulltext", ["churnRisk"], { fulltext: true })
@Index("idx_customer_businessType_fulltext", ["businessType"], { fulltext: true })


@Entity()
export class Customer {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: 0 })
  createdByUserId!: number;

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
  note!: string;

  @Column({ default: 0 })
  businessSize!: number;

  @Column({ default: "" })
  businessEntity!: string;

  @Column({ default: "" })
  businessType!: string;

  @Column({ default: "" })
  businessAddress!: string;

  @Column({default:""})
  businessWebsite! : string;

  @Column ({default : 0})
  referralCode! : number;
  
  @Column({ default: "" })
  phoneNumber!: string;

  @Column({ default: "", unique: true })
  email!: string;

  @Column({ default: "" })
  password!: string;

  @Column({ default: "" })
  stage!: string;

  @Column({ default: "" })
  churnRisk!: string;

  @Column("simple-array", { default: "" })
  practiceArea!: string[];

  @Column({ type: "enum", enum: ["Active", "Trial", "License Expired", "Free"], default: "Free" })
  status!: Status;

  @CreateDateColumn()
  expiryDate!: Date;

  @CreateDateColumn()
  lastActive!: Date;

  @CreateDateColumn()
  deletedAt!: Date;

  @CreateDateColumn()
  reasonForDeletion!: string;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

}
