import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";
@Entity()
@Index("idx_business_types_name_fulltext", ["name"], { fulltext: true })
export class BusinessType {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: "" })
  name!: string;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
