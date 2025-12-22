import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export type Status = "Active" | "Trial" | "License Expired" | "Free" | "Inactive";

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
  title!: string; // Mr, Mrs, Ms, Dr

  @Column({ default: "" })
  firstName!: string;

  @Column({ default: "" })
  middleName!: string;

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
  
  @Column({ type: "json", nullable: true })
  businessAddress!: {
    buildingName: string;
    buildingNumber: string;
    street: string;
    town: string;
    city: string;
    county: string;
    postalCode: string;
    country: string;
  };

  @Column({default:""})
  businessWebsite! : string;

  @Column ({default : 0})
  referralCode! : number;
  
  @Column({ default: "" })
  phoneNumber!: string;

  @Column({ default: "" })
  phoneType!: string; // Mobile, Work, Home

  @Column({ default: "" })
  countryCode!: string; // +44, +1, etc.

  @Column({ default: "", unique: true })
  email!: string;

  @Column({ default: "" })
  emailType!: string; // Work, Personal

  @Column({ default: "" })
  password!: string;

  @Column({ default: "" })
  stage!: string;

  @Column({ default: "" })
  churnRisk!: string;

  @Column("simple-array", { default: "" })
  practiceArea!: string[];

  @Column({ type: "enum", enum: ["Active", "Trial", "License Expired", "Free", "Inactive"], default: "Free" })
  status!: Status;

  @Column({ nullable: true, type: "varchar", default: null })
  otp!: string | null;

  @Column({ nullable: true, type: "datetime", default: null })
  otpExpiry!: Date | null;

  @Column({default: false})
  isEmailVerified!: boolean;

  @Column({ default: 0 })
  currencyId!: number;

  @Column({ default: 0 })
  packageId!: number;
  
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
