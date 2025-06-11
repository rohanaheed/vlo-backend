import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";


@Entity()
export class BusinessEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;
}
