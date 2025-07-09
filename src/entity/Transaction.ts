import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class Transaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('decimal', { precision: 12, scale: 2 })
  amount!: number;

  @Column()
  currencyId!: number;

  @Column()
  status!: string; // e.g., 'pending', 'completed', 'failed'

  @Column({ type: 'timestamp' })
  transactionDate!: Date;

  @Column()
  paymentMethod!: string; // e.g., 'card', 'bank_transfer', 'paypal'

  @Column({ nullable: true })
  reference?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: 0 })
  customerId!: number;

  @Column({ default: 0 })
  invoiceId!: number;

  @Column({ default: false })
  isDeleted!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
