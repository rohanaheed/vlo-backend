import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";


@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: 0 })
  customerId!: number;

  @Column({ default: 0 })
  orderNumber!: number;

  @Column({ default: "" })
  originalOrderNumber!: string;

  @Column({ default: "" })
  orderDate!: string;

  @Column({ default: 0 })
  subTotal!: number;

  @Column({ default: 0 })
  discount!: number;

  @Column({ default: 0 })
  discountType!: number;

  @Column({ default: 0 })
  total!: number;

  @Column({ default: "pending" })
  status!: string;

  @Column({ default: 0 })
  currencyId!: number;

  @Column({ default: "" })
  note!: string;

  @Column({ default: 0 })
  addedBy!: number;

  @Column({ default: "" })
  customOrderNumber!: string;

  @Column()
  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

}