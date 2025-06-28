import dotenv from "dotenv";
dotenv.config();
import "reflect-metadata";
import express from "express";
import { AppDataSource } from "./config/db";
import userRoutes from "./routes/userRoutes";
import authRoutes from "./routes/authRoutes";
import customerRoutes from "./routes/customerRoutes";
import businessRoutes from "./routes/businessRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import packageRoutes from "./routes/packageRoutes";

const app = express();
app.use(express.json());


// Define new routes here
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/stripe", paymentRoutes);
app.use("/api/packages", packageRoutes);

const PORT = process.env.PORT;

AppDataSource.initialize()
  .then(() => {
    console.log("Database connected");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err: any) => {
    console.error("Database connection failed:", err);
  });
