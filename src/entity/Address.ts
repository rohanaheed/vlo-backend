import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";


@Entity()
export class Address {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: "" })
  buildingNumber!: string;

  @Column({ default: "" })
  buildingName!: string;

  @Column({ default: "" })
  street!: string;

  @Column({ default: "" })
  town!: string;

  @Column({ default: "" })
  city!: string;

  @Column({ default: "" })
  state!: string;

  @Column({ default: "" })
  country!: string;

  @Column({ default: "" })
  district!: string;

  @Column({ default: "" })
  postalCode!: string;

  @Column({ default: 0 })
  customerId!: number;

  @Column({ default: "" })
  notes!: string;

  @Column({ default: false })
  isDelete!: boolean;

  @Column({ default: false })
  isDefault!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
