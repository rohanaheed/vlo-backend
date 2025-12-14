import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

export type UserRole = "user" | "super_admin";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: "" })
  name!: string;

  @Column({ default: "" })
  email!: string;

  @Column({ default: "" })
  password!: string;
  
  @Column({ type: "enum", enum: ["user", "super_admin", "customer"], default: "user" })
  role!: UserRole;

  @Column({ nullable: true, type: "varchar", default: null })
  otp!: string | null;

  @Column({ nullable: true, type: "datetime", default: null })
  otpExpiry!: Date | null;

  @Column({default: false})
  isVarified!: boolean

  @Column({ default: false })
  isDelete!: boolean;

  @Column({ nullable: true })
  userGroupId!: number | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
