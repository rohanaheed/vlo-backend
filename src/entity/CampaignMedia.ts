import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn
} from "typeorm";

export type MediaType = "image" | "video" | "document" | "audio" | "gif";

@Entity()
export class CampaignMedia {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: 0 })
  campaignId!: number;

  @Column({ default: 0 })
  campaignChannelId!: number;

  @Column({ type: "varchar", length: 500 })
  mediaUrl!: string;

  @Column({ 
    type: "enum", 
    enum: ["image", "video", "document", "audio", "gif"],
    default: "image"
  })
  mediaType!: MediaType;

  @Column({ type: "varchar", length: 255 })
  fileName!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "varchar", length: 100 })
  mimeType!: string;

  @Column({ type: "bigint", default: 0 })
  fileSize!: number;

  @Column({ type: "int" })
  width!: number;

  @Column({ type: "int" })
  height!: number;

  @Column({ type: "int" })
  duration!: number;

  @Column({ type: "varchar", length: 255 })
  thumbnailUrl!: string;

  @Column({ type: "json" })
  metadata!: any;

  @Column({ default: false })
  isDelete!: boolean;

  @CreateDateColumn()
  uploadedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
