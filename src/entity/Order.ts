import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

export type OrderStatus = "pending" | "completed" | "incomplete" | "cancelled" | "processing" | "failed";

@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: 0 })
  customerId!: number;

  @Column({ type: "varchar", length: 50 })
  orderNumber!: string; 

  @Column({ type: "varchar", length: 50 })
  originalOrderNumber!: string; 

  @Column({ type: "varchar", length: 30 })
  orderDate!: string;

  @Column({ default: 0 })
  subTotal!: number;

  @Column({ default: 0 })
  discount!: number;

  @Column({ default: 0 })
  discountType!: number;

  @Column({ default: 0 })
  total!: number;

  @Column({ type: "enum", enum: ["pending","completed","incomplete","cancelled","processing","failed"], default: "pending" })
  status!: OrderStatus;

  @Column({ default: 0 })
  currencyId!: number;

  @Column({ default: "" })
  note!: string;

  @Column({ default: 0 })
  addedBy!: number;

  @Column({ type: "varchar", length: 50 })
  customOrderNumber!: string;

  @Column()
  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

}