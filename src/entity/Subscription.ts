import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Customer } from "./Customer"

@Entity()
export class Subscription {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  type!: string;

  @Column()
  price!: string;

  @ManyToOne(() => Customer, (customer) => customer.subscriptions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "customerId" })
  customer!: Customer;
}
