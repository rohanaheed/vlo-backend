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
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

// Swagger setup
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "VHR API Documentation",
      version: "1.0.0",
      description: "API documentation for the VHR system",
    },
    servers: [
      {
        url: "http://localhost:" + (process.env.PORT || 3000),
      },
      {
        url: "http://51.21.200.149:3000",
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Customer: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            userId: { type: 'integer' },
            logo: { type: 'string', nullable: true },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            businessName: { type: 'string' },
            tradingName: { type: 'string' },
            subscription: { type: 'string', nullable: true },
            note: { type: 'string' },
            businessSize: { type: 'string' },
            businessEntity: { type: 'string' },
            businessType: { type: 'string' },
            businessAddress: { type: 'string', nullable: true },
            phoneNumber: { type: 'string' },
            email: { type: 'string' },
            practiceArea: { type: 'string', nullable: true },
            status: { type: 'string' },
            expirayDate: { type: 'string', format: 'date-time' },
            packageId: { type: 'integer', nullable: true },
            isDelete: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CustomerInput: {
          type: 'object',
          required: [
            'firstName', 'lastName', 'businessName', 'businessSize', 'businessEntity', 'businessType', 'phoneNumber', 'email', 'password', 'status'
          ],
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            businessName: { type: 'string' },
            tradingName: { type: 'string' },
            note: { type: 'string' },
            businessSize: { type: 'string' },
            businessEntity: { type: 'string' },
            businessType: { type: 'string' },
            phoneNumber: { type: 'string' },
            email: { type: 'string' },
            password: { type: 'string' },
            status: { type: 'string' },
            expirayDate: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [
    "./src/routes/*.ts",
    "./src/controllers/*.ts",
    // You can add more paths if you want to document inline in controllers
  ],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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
