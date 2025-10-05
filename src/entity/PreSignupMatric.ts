import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class PreSignupMatric {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", default: "pre_signup" })
  category!: "pre_signup" | "signup_abandonment" | "activation" | "retention_payment";

  @Column({ type: "varchar" })
  metricType!:
    | "anonymous_visitors"
    | "lead_magnet_engagers"
    | "pricing_page_bouncers"
    | "form_abandoners"
    | "oauth_dropoffs"
    | "verification_ghosts"
    | "feature_explorers"
    | "integration_stuck"
    | "team_invite_ghosts"
    | "discount_hunters"
    | "silent_churn_risks"
    | "renewal_draggers";
  
  @Column({ type: "int", default: 0 })
  value!: number;

  @Column({ type: "timestamp" })
  date!: Date;

  @Column({ type: "varchar", nullable: true })
  source!: string; // e.g. "homepage", "landing", "pricing"

  @Column({ type: "json", nullable: true })
  metadata!: any; // store extra event data (UTM, referrer, etc.)

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ default: false })
  isDelete!: boolean;
}
