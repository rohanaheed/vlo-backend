import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";


@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  customerId!: number;

  @Column()
  orderNumber!: number;

  @Column()
  originalOrderNumber!: string;

  @Column()
  orderDate!: string;

  @Column()
  subTotal!: number;

  @Column()
  discount!: number;

  @Column()
  discountType!: number;

  @Column()
  total!: number;

  @Column()
  status!: string;

  @Column()
  currencyId!: number;

  @Column()
  note!: string;

  @Column()
  addedBy!: number;

  @Column()
  customOrderNumber!: string;

  @Column()
  @UpdateDateColumn()
  updatedAt!: Date;

  @Column()
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

}