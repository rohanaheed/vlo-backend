import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../entity/User";
import { Customer } from "../entity/Customer";
import { BusinessType } from "../entity/BusinessType";
import { BusinessEntity } from "../entity/BusniessEntity";
import { BusinessPracticeArea } from "../entity/BusinessPracticeArea";
import { PaymentMethod } from "../entity/PaymentMethod";
import { Package } from "../entity/Package";

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
    User,
    Customer,
    BusinessEntity,
    BusinessType,
    BusinessPracticeArea,
    PaymentMethod,
    Package
  ]
});
