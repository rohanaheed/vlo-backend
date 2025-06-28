import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";


@Entity()
export class Address {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  buildingNumber!: string;

  @Column()
  buildingName!: string;

  @Column()
  street!: string;

  @Column()
  town!: string;

  @Column()
  city!: string;

  @Column()
  state!: string;

  @Column()
  country!: string;

  @Column()
  district!: string;

  @Column()
  postalCode!: string;

  @Column()
  customerId!: number;

  @Column()
  notes!: string;

  @Column()
  isDelete!: boolean;

  @Column()
  isDefault!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
