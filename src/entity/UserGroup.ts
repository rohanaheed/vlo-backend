import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

// Permission levels as defined in UI
export type PermissionLevel = "Full Access" | "Access Denied" | "Data Entry" | "Read Only";

// Default modules permissions structure
export interface DefaultPermissions {
  clientsAndMatter: PermissionLevel;
  consultations: PermissionLevel;
  accounts: PermissionLevel;
  receiptBook: PermissionLevel;
  contactBook: PermissionLevel;
  logBook: PermissionLevel;
  reports: PermissionLevel;
}

// Custom permission structure for dynamic modules
export interface ModulePermission {
  module: string;
  level: PermissionLevel;
}

@Entity()
export class UserGroup {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  title!: string;

  @Column({ type: "text", nullable: true })
  description!: string;

  // JSON column for default module permissions
  @Column("json")
  permissions!: DefaultPermissions;

  // JSON column for custom/dynamic permissions (per-group)
  @Column("json", { nullable: true })
  customPermissions!: ModulePermission[] | null;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
