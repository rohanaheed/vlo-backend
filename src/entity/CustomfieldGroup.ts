import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";
@Entity()
@Index("idx_custom_field_groups_title_fulltext", ["title"], { fulltext: true })
@Index("idx_custom_field_groups_linkedTo_fulltext", ["linkedTo"], { fulltext: true })
export class CustomfieldGroup {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: "" })
  title!: string;

  @Column({ nullable: false, default: 0 })
  subcategoryId!: number;

  @Column({ default: "", nullable: false })
  linkedTo!: string;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
