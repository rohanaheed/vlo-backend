import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class FinancialStatement {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ default: "" })
    matterId!: string;

    @Column({ default: 0 })
    userId!: number;

    @Column({ default: 0 })
    customerId!: number;

    @Column({ default: 0 })
    currencyId!: number;

    @Column({ default: "" })
    customerName!: string;

    @Column({ default: "" })
    customerEmail!: string;

    @Column({ default: "" })
    caseDescription!: string;

    @Column({ type: "timestamp", nullable: true })
    completionDate!: Date;

    @Column({ type: "json", nullable: true })
    disbursements!: {
        description?: string;
        charges?: number;
        vatAmount?: number;
        total?: number;
    }[];

    @Column({ default: 0 })
    totalDisbursements!: number;

    @Column({ type: "json", nullable: true })
    ourCost!: {
        description?: string;
        charges?: number;
        vatAmount?: number;
        total?: number;
    }[];

    @Column({ default: 0 })
    totalOurCosts!: number;
 
    @Column({ default: 0 })
    totalAmountRequired!: number;
    
    @Column({ type: "json", nullable: true })
    summary!: {
        label: string;
        subTotal: number;
        total: number;
    }[];

    @Column({
        type: "enum",
        enum: ["draft", "sent", "unsent", "paid", "overdue", "cancelled", "partialyPaid", "disputed", "reminder", "resend", "void", "viewed", "unpaid", "bad"],
        default: "draft"
      })
      status!: string;

    @Column({ default: false})
    isDelete!: boolean;

    @CreateDateColumn()
    createdAt!: Date;
    
    @UpdateDateColumn()
    updatedAt!: Date;

}