import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";


@Entity()
export class ContactDetails {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  workEmail!: string;

  @Column()
  homeEmail!: string;

  @Column()
  workPhone!: string;

  @Column()
  homePhone!: string;

  @Column()
  designation!: string;

  @Column()
  customerId!: number;

  @Column()
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
