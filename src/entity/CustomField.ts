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

  @Column({
    type: "enum",
    enum: [
      "client_select",
      "firm_users",
      "full_address",
      "website_url",
      "date",
      "time",
      "phone",
      "email",
      "text",
      "paragraph",
      "rich_text",
      "checkboxes",
      "multiple_choice",
      "user_select",
      "dropdown",
      "matter_select",
      "header",
      "price_currency",
      "integer",
      "decimal",
      "file_upload",
      "tags",
      "boolean",
      "duration",
      "rating",
      "signature"
    ],
    default: "text"
  })
  type!: string;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
