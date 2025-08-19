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
    Document
  ]
});
