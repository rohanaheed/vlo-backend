import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../entity/User";
import { Customer } from "../entity/Customer";
import { BusinessType } from "../entity/BusinessType";
import { BusinessEntity } from "../entity/BusniessEntity";
import { BusinessPracticeArea } from "../entity/BusinessPracticeArea";
import { PaymentMethod } from "../entity/PaymentMethod";
import { Package } from "../entity/Package";
import { Order } from "../entity/Order";
import { Currency } from "../entity/Currency";
import { Invoice } from "../entity/Invioce";
import { CreditNotes } from "../entity/CreditNotes";
import { Matter } from "../entity/Matter"
import { Address } from "../entity/Address"
import { BankAccounts } from "../entity/BankAccounts"
import { Business } from "../entity/Business"
import { ContactDetails } from "../entity/ContactDetails"
import { Installment } from "../entity/Installment"
import { InvoiceHistory } from "../entity/InvoiceHistory"
import { Note } from "../entity/Note"
import { Reminder } from "../entity/Reminder"
import { Transaction } from "../entity/Transaction"
import { TimeBill } from "../entity/TimeBill"
import { Document } from "../entity/Documents"
import { Complain } from "../entity/Complain"
import { Ticket } from "../entity/Ticket"
import { Task } from "../entity/Task"
import { Subtask } from "../entity/Subtask"
import { HeadsUp } from "../entity/HeadsUp"
import { Subscription } from "../entity/Subscription"
import { PackageModule } from "../entity/PackageModule"
import { Subcategory } from "../entity/Subcategory"
import { CustomfieldGroup } from "../entity/CustomfieldGroup"
import { CustomField } from "../entity/CustomField"
import { PreSignupMatric } from "../entity/PreSignupMatric"
import { MarketingCampaign } from "../entity/MarketingCampaign"
import { CampaignChannel } from "../entity/CampaignChannel"
import { CampaignMedia } from "../entity/CampaignMedia"
import { Lead } from "../entity/Lead"
import { EmailPerformance } from "../entity/EmailPerformance"
import { SocialMediaPerformance } from "../entity/SocialMediaPerformance"
import { SMSPerformance } from "../entity/SMSPerformance"
import { GoogleAdsPerformance } from "../entity/GoogleAdsPerformance"
import { CustomerPackage } from "../entity/CustomerPackage";
import { UserGroup } from "../entity/UserGroup";
import { FinancialStatement } from "../entity/FinancialStatement";

export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: true,
  logging: false,
  entities: [
    Business,
    ContactDetails,
    Installment,
    InvoiceHistory,
    Note,
    Reminder,
    Transaction,
    User,
    Customer,
    CustomerPackage,
    BusinessEntity,
    BusinessType,
    BusinessPracticeArea,
    PaymentMethod,
    Package,
    Currency,
    Order,
    Invoice,
    CreditNotes,
    Matter,
    Address,
    BankAccounts,
    TimeBill,
    Document,
    Complain,
    Ticket,
    Task,
    Subtask,
    HeadsUp,
    Subscription,
    PackageModule,
    Subcategory,
    CustomfieldGroup,
    CustomField,
    PreSignupMatric,
    MarketingCampaign,
    CampaignChannel,
    CampaignMedia,
    Lead,
    EmailPerformance,
    SocialMediaPerformance,
    SMSPerformance,
    GoogleAdsPerformance,
    UserGroup,
    FinancialStatement
  ]
});
