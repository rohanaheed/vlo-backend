import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from "typeorm";

@Entity()

export class CustomerVerification {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ nullable: true, default: null, unique: true })
    email!: string;

    @Column({ nullable: true, type: "varchar", default: null })
    emailOtp!: string | null;

    @Column({ nullable: true, type: "datetime", default: null })
    emailOtpExpiry!: Date | null;

    @Column({ default: false })
    isEmailVerified!: boolean;

    @Column({ default: "" })
    phoneNumber!: string;

    @Column({ default: "" })
    countryCode!: string;

    @Column({ nullable: true, type: "datetime", default: null })
    phoneCodeSentAt!: Date | null;

    @Column({ default: false })
    isPhoneVerified!: boolean;

    @Column({ default: false })
    isDelete!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
