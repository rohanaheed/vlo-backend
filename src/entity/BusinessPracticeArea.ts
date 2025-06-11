import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
@Entity()
export class BusinessPracticeArea {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;
}
