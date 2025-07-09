import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
@Entity()
export class PaymentMethod {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: "" })
  paymentMethod!: string;

  @Column({ default: "" })
  customerId!: string;

  @Column({ default: "" })
  name!: string;

  @Column({ default: "" })
  cardNumber!: string;

  @Column({ default: "" })
  cardHolderName!: string;

  @Column({ default: "" })
  cardExpiryDate!: string;

  @Column({ default: "" })
  cardCvv!: string;

  @Column({ default: "" })
  zipCode!: string;

  @Column({ default: "" })
  country!: string;

  @Column({ default: false })
  isDefault!: boolean;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
