import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";


@Entity()
export class ContactDetails {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: "" })
  name!: string;

  @Column({ default: "" })
  workEmail!: string;

  @Column({ default: "" })
  homeEmail!: string;

  @Column({ default: "" })
  workPhone!: string;

  @Column({ default: "" })
  homePhone!: string;

  @Column({ default: "" })
  designation!: string;

  @Column({ default: 0 })
  customerId!: number;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
