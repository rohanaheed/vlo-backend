import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";
@Entity()
@Index("idx_subcategories_title_fulltext", ["title"], { fulltext: true })
export class Subcategory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: "" })
  title!: string;

  @Column({ nullable: false, default: 0 })
  BusinessPracticeAreaId!: number;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
