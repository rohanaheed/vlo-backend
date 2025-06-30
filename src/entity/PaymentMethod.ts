import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
@Entity()
export class PaymentMethod {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  paymentMethod!: string;

  @Column()
  customerId!: string;

  @Column()
  name!: string;

  @Column()
  cardNumber!: string;

  @Column()
  cardHolderName!: string;

  @Column()
  cardExpiryDate!: string;

  @Column()
  cardCvv!: string;

  @Column()
  zipCode!: string;

  @Column()
  country!: string;

  @Column()
  isDefault!: boolean;

  @Column()
  isActive!: boolean;

  @Column()
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
