import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

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
}
