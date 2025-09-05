import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

export type BillingCycle = "Monthly" | "Annual";
@Entity()
export class Package {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: "" })
  name!: string;

  @Column({ default: "" })
  description!: string;

  @Column({ default: 0 })
  price!: number;

  @Column({ type: "enum", enum: ["Monthly", "Annual"], default: "Monthly" })
  billingCycle!: BillingCycle;

  @Column({ default: true })
  isActive!: boolean;

  @Column("json", { nullable: true })
  includedFeatures!: { name: string; isEnabled?: boolean }[];

  @Column("json", { nullable: true })
  integrations!: { name: string; isEnabled?: boolean }[];

  @Column("json", { nullable: true })
  communicationTools!: { name: string; isEnabled?: boolean }[];

  @Column("json", { nullable: true })
  cloudStorage!: { name: string; isEnabled?: boolean }[];

  @Column("json", { nullable: true })
  socialMediaConnectors!: { name: string; isEnabled?: boolean }[];

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
