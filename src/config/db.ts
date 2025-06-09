import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../entity/User";

export const AppDataSource = new DataSource({
  type: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "",
  database: "virtualhrsystem_database",
  synchronize: true,
  logging: false,
  entities: [User],
  // Optional:
  // extra: { authPlugins: { mysql_clear_password: () => () => Buffer.from("your_password") } }
});
