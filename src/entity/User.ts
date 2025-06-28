import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

export type UserRole = "user" | "super_admin";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  email!: string;

  @Column()
  password!: string;
  
  @Column({ type: "enum", enum: ["user", "super_admin"], default: "user" })
  role!: UserRole;

  @Column({ nullable: true, type: "varchar" })
  otp!: string | null;

  @Column({ nullable: true, type: "datetime" })
  otpExpiry!: Date | null;

  @Column()
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
