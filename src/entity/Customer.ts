import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany
} from "typeorm";
import { Subscription } from "./Subscription";

export type Status = "Active" | "Trial" | "License Expired" | "Free";


@Entity()
export class Customer {
  @PrimaryGeneratedColumn()
  id!: number;

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
  phoneNumber!: string;

  @Column()
  email!: string;

  @Column()
  password!: string;

  @Column({ type: "enum", enum: ["Active" , "Trial" , "License Expired" , "Free"], default: "Free" })
  status!: Status;

  @CreateDateColumn()
  expirayDate!: string;

  @OneToMany(() => Subscription, (subscription) => subscription.customer)
  subscriptions!: Subscription[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

}
