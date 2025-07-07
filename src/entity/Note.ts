import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";


@Entity()
export class Note {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column("text")
  content!: string;

  @Column()
  customerId!: number;
  
  @Column()
  type!: string;


  @UpdateDateColumn()
  updatedAt!: Date;

  @Column()
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

}