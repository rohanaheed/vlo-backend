import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
@Entity()
export class BusinessType {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;
}
