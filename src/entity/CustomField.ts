import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";
@Entity()
@Index("idx_custom_fields_title_fulltext", ["title"], { fulltext: true })
@Index("idx_custom_fields_templateKeyword_fulltext", ["templateKeyword"], { fulltext: true })
export class CustomField {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: "" })
  title!: string;

  @Column({ nullable: false, default: 0 })
  BusinessPracticeAreaId!: number;

  @Column({ nullable: false, default: 0 })
  CustomfieldGroupId!: number;

  @Column({ default: "" })
  templateKeyword!: string;

  @Column({ type: "enum", enum: ["text", "number", "date", "checkbox", "radio", "select", "textarea"], default: "text" })
  type!: string;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
