import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Subscription {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  type!: string;

  @Column()
  name!: string;

  @Column()
  maxEmployees!: number;

  @Column()
  maxStorage!: number;

  @Column()
  storageUnit!: string;

  @Column()
  isPrivate!: boolean;
  
  @Column() 
  isRecommended!: boolean;

  @Column() 
  isDelete!: boolean;

  @Column()
  price!: string;

  @Column()
  planDuration!: string;

  @Column()
  currency!: string;

  @Column("simple-array")
  modules!: string[];

  @Column()
  additionalInformation!: string;

  @Column()
  briefBenifitLine!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
