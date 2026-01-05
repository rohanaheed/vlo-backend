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
import orderRoutes from "./routes/orderRoutes";
import invoiceRoutes from "./routes/invoiceRoutes";
import creditNotesRoutes from "./routes/creditNotesRoutes";
import noteRoutes from "./routes/noteRoutes";
import matterRoutes from "./routes/matterRoutes";
import installmentRoutes from "./routes/installmentRoutes";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import cors from "cors";
import timeBillRoutes from "./routes/timeBillRoutes";
import subscriptionRoutes from "./routes/subscriptionRoutes";
import headsUpRoutes from "./routes/headsUpRoutes";
import preSignupMatricRoutes from "./routes/preSignupMatricRoutes";
import marketingRoutes from "./routes/marketingRoutes";
import currencyRoutes from "./routes/currencyRoutes";
import userGroupRoutes from "./routes/userGroupRoutes";
import financialStatementRoutes from "./routes/financialStatementRoutes";
import { handleStripeWebhook } from "./controllers/stripWebhookController";

const app = express();

app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

app.use(express.json({ limit: "20mb" }));
app.use(
  cors({
    origin: ["http://localhost:3000", "http://13.60.55.29:3000"],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  })
);

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
            'firstName',
            'lastName',
            'stage',
            'churnrisk',
            'businessName',
            'tradingName',
            'businessSize',
            'businessEntity',
            'businessType',
            'phoneNumber',
            'email',
            'password',
            'createdByUserId'
          ],
          properties: {
            firstName: { type: 'string', maxLength: 50 },
            lastName: { type: 'string', maxLength: 50 },
            stage: { type: 'string', maxLength: 50 },
            churnRisk: { type: 'string', maxLength: 50 },
            logo: { type: 'string', nullable: true },
            businessName: { type: 'string', maxLength: 100 },
            tradingName: { type: 'string', maxLength: 100 },
            note: { type: 'string', nullable: true },
            businessSize: { type: 'integer', minimum: 1 },
            businessEntity: { type: 'string' },
            businessType: { type: 'string' },
            phoneNumber: { type: 'string', pattern: '^[0-9]{10,15}$' },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            status: { type: 'string', enum: ['Active', 'Trial', 'License Expired', 'Free'], default: 'Free' },
            expirayDate: { type: 'string', format: 'date-time', nullable: true },
            createdByUserId: { type: 'integer', minimum: 1 },
            isDelete: { type: 'boolean', default: false }
          },
        },
        Invoice: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            invoiceNumber: { type: 'string' },
            amount: { type: 'number' },
            status: { 
              type: 'string',
              enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'partialyPaid', 'disputed', 'reminder', 'resend', 'void', 'viewed', 'unpaid']
            },
            paymentStatus: { 
              type: 'string',
              enum: ['pending', 'paid', 'failed', 'refunded']
            },
            plan: { type: 'string' },
            customerId: { type: 'integer' },
            currencyId: { type: 'integer' },
            orderId: { type: 'integer' },
            isDelete: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CreditNote: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            creditNoteNumber: { type: 'string' },
            amount: { type: 'number' },
            customerId: { type: 'integer' },
            invoiceId: { type: 'integer' },
            currencyId: { type: 'integer' },
            description: { type: 'string' },
            transactionMode: { type: 'string' },
            referenceNumber: { type: 'string' },
            bankAccount: { type: 'string' },
            status: { 
              type: 'string',
              enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'partialyPaid', 'disputed', 'reminder', 'resend', 'void', 'viewed', 'unpaid']
            },
            isDelete: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Note: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            content: { type: 'string' },
            customerId: { type: 'integer' },
            type: { type: 'string' },
            isDelete: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        NoteInput: {
          type: 'object',
          required: ['title', 'content', 'customerId', 'type'],
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 255 },
            content: { type: 'string', minLength: 1 },
            customerId: { type: 'integer', minimum: 1 },
            type: { type: 'string', minLength: 1, maxLength: 100 },
          },
        },
        NoteUpdateInput: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 255 },
            content: { type: 'string', minLength: 1 },
            customerId: { type: 'integer', minimum: 1 },
            type: { type: 'string', minLength: 1, maxLength: 100 },
          },
        },
        TimeBill: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            customerId: { type: 'integer' },
            matterId: { type: 'integer' },
            entryId: { type: 'integer' },
            caseWorker: { type: 'string' },
            matter: { type: 'string' },
            costDescription: { type: 'string' },
            unit: { type: 'string' },
            duration: { type: 'string' },
            status: { type: 'string' },
            isDelete: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        TimeBillInput: {
          type: 'object',
          properties: {
            customerId: { type: 'integer' },
            matterId: { type: 'integer' },
            entryId: { type: 'integer' },
            caseWorker: { type: 'string' },
            matter: { type: 'string' },
            costDescription: { type: 'string' },
            unit: { type: 'string' },
            duration: { type: 'string' },
            status: { type: 'string' },
          },
        },
        Package: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number' },
            billingCycle: { 
              type: 'string',
              enum: ['Monthly', 'Annual']
            },
            isActive: { type: 'boolean' },
            includedFeatures: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  isEnabled: { type: 'boolean' }
                }
              }
            },
            integrations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  isEnabled: { type: 'boolean' }
                }
              }
            },
            communicationTools: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  isEnabled: { type: 'boolean' }
                }
              }
            },
            cloudStorage: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  isEnabled: { type: 'boolean' }
                }
              }
            },
            socialMediaConnectors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  isEnabled: { type: 'boolean' }
                }
              }
            },
            isDelete: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        PackageModule: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            includedFeatures: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  price: { type: 'number', minimum: 0 },
                  isEnabled: { type: 'boolean' },
                  billingCycle: { type: 'string', enum: ['Monthly', 'Annual'] }
                }
              }
            },
            isDelete: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        BusinessEntity: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            isDelete: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        BusinessEntityInput: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 }
          }
        },
        BusinessType: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            isDelete: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        BusinessTypeInput: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 }
          }
        },
        BusinessPracticeArea: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            code: { type: 'string' },
            isDelete: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        BusinessPracticeAreaInput: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 255 },
            code: { type: 'string', minLength: 1, maxLength: 255 }
          }
        },
        HeadsUp: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string', maxLength: 100 },
            module: { type: 'string', maxLength: 50 },
            enabled: { type: 'boolean' },
            rule: { type: 'string', maxLength: 500 },
            frequency: { 
              type: 'string',
              enum: ['daily', 'weekly', 'monthly', 'yearly']
            },
            timeOfDay: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' },
            timeZone: { type: 'string', maxLength: 50 },
            status: { 
              type: 'string',
              enum: ['active', 'inactive']
            },
            nextRunDate: { type: 'string', format: 'date-time' },
            lastRunDate: { type: 'string', format: 'date-time' },
            rowsInEmail: { type: 'integer', minimum: 0 },
            contentType: { type: 'string', maxLength: 50 },
            resultsGrouped: { type: 'string', maxLength: 100 },
            isDelete: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        HeadsUpInput: {
          type: 'object',
          required: ['name', 'module', 'rule', 'frequency', 'timeOfDay', 'timeZone', 'nextRunDate', 'lastRunDate'],
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100 },
            module: { type: 'string', minLength: 2, maxLength: 50 },
            enabled: { type: 'boolean', default: false },
            rule: { type: 'string', minLength: 2, maxLength: 500 },
            frequency: { 
              type: 'string',
              enum: ['daily', 'weekly', 'monthly', 'yearly']
            },
            timeOfDay: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' },
            timeZone: { type: 'string', minLength: 2, maxLength: 50 },
            status: { 
              type: 'string',
              enum: ['active', 'inactive'],
              default: 'active'
            },
            nextRunDate: { type: 'string', format: 'date-time' },
            lastRunDate: { type: 'string', format: 'date-time' },
            rowsInEmail: { type: 'integer', minimum: 0, default: 0 },
            contentType: { type: 'string', minLength: 2, maxLength: 50, default: '' },
            resultsGrouped: { type: 'string', minLength: 2, maxLength: 100, default: '' },
            isDelete: { type: 'boolean', default: false },
            countOfExpiringSubscriptions: { type: 'integer', minimum: 0, default: 0 },
            avgActivityLevel: { type: 'integer', minimum: 0, default: 0 }
          }
        },
        HeadsUpUpdateInput: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100 },
            module: { type: 'string', minLength: 2, maxLength: 50 },
            enabled: { type: 'boolean' },
            rule: { type: 'string', minLength: 2, maxLength: 500 },
            frequency: { 
              type: 'string',
              enum: ['daily', 'weekly', 'monthly', 'yearly']
            },
            timeOfDay: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' },
            timeZone: { type: 'string', minLength: 2, maxLength: 50 },
            status: { 
              type: 'string',
              enum: ['active', 'inactive']
            },
            nextRunDate: { type: 'string', format: 'date-time' },
            lastRunDate: { type: 'string', format: 'date-time' },
            rowsInEmail: { type: 'integer', minimum: 0 },
            contentType: { type: 'string', minLength: 2, maxLength: 50 },
            resultsGrouped: { type: 'string', minLength: 2, maxLength: 100 },
            isDelete: { type: 'boolean' },
            countOfExpiringSubscriptions: { type: 'integer', minimum: 0 },
            avgActivityLevel: { type: 'integer', minimum: 0 }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        BadRequestError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Bad Request' },
            errors: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        UnauthorizedError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Unauthorized' }
          }
        },
        NotFoundError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Not Found' }
          }
        },
        InternalServerError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Internal Server Error' }
          }
        },
        Currency: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            country: { type: 'string', maxLength: 100 },
            currencyCode: { type: 'string', maxLength: 10 },
            currencyName: { type: 'string', maxLength: 100 },
            currencySymbol: { type: 'string', maxLength: 10 },
            exchangeRate: { type: 'number', minimum: 0 },
            isCrypto: { type: 'boolean' },
            USDPrice: { type: 'number', minimum: 0 },
            isDelete: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        CurrencyInput: {
          type: 'object',
          required: ['currencyCode', 'currencyName', 'currencySymbol'],
          properties: {
            country: { type: 'string', minLength: 2, maxLength: 100 },
            currencyCode: { type: 'string', minLength: 2, maxLength: 10 },
            currencyName: { type: 'string', minLength: 2, maxLength: 100 },
            currencySymbol: { type: 'string', minLength: 1, maxLength: 10 },
            exchangeRate: { type: 'number', minimum: 0, default: 1 },
            isCrypto: { type: 'boolean', default: false },
            USDPrice: { type: 'number', minimum: 0, default: 0 }
          }
        },
        CurrencyUpdateInput: {
          type: 'object',
          properties: {
            country: { type: 'string', maxLength: 100 },
            currencyCode: { type: 'string', minLength: 2, maxLength: 10 },
            currencyName: { type: 'string', minLength: 2, maxLength: 100 },
            currencySymbol: { type: 'string', minLength: 1, maxLength: 10 },
            exchangeRate: { type: 'number', minimum: 0 },
            isCrypto: { type: 'boolean' },
            USDPrice: { type: 'number', minimum: 0 }
          }
        },
        UserGroup: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string', maxLength: 100 },
            description: { type: 'string', maxLength: 500 },
            permissions: {
              type: 'object',
              properties: {
                clientsAndMatter: { type: 'string', enum: ['Full Access', 'Access Denied', 'Data Entry', 'Read Only'] },
                consultations: { type: 'string', enum: ['Full Access', 'Access Denied', 'Data Entry', 'Read Only'] },
                accounts: { type: 'string', enum: ['Full Access', 'Access Denied', 'Data Entry', 'Read Only'] },
                receiptBook: { type: 'string', enum: ['Full Access', 'Access Denied', 'Data Entry', 'Read Only'] },
                contactBook: { type: 'string', enum: ['Full Access', 'Access Denied', 'Data Entry', 'Read Only'] },
                logBook: { type: 'string', enum: ['Full Access', 'Access Denied', 'Data Entry', 'Read Only'] },
                reports: { type: 'string', enum: ['Full Access', 'Access Denied', 'Data Entry', 'Read Only'] }
              }
            },
            customPermissions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  module: { type: 'string' },
                  level: { type: 'string', enum: ['Full Access', 'Access Denied', 'Data Entry', 'Read Only'] }
                }
              }
            },
            isActive: { type: 'boolean' },
            isDelete: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        UserGroupInput: {
          type: 'object',
          required: ['title', 'permissions'],
          properties: {
            title: { type: 'string', minLength: 2, maxLength: 100 },
            description: { type: 'string', maxLength: 500 },
            permissions: {
              type: 'object',
              required: ['clientsAndMatter', 'consultations', 'accounts', 'receiptBook', 'contactBook', 'logBook', 'reports'],
              properties: {
                clientsAndMatter: { type: 'string', enum: ['Full Access', 'Access Denied', 'Data Entry', 'Read Only'] },
                consultations: { type: 'string', enum: ['Full Access', 'Access Denied', 'Data Entry', 'Read Only'] },
                accounts: { type: 'string', enum: ['Full Access', 'Access Denied', 'Data Entry', 'Read Only'] },
                receiptBook: { type: 'string', enum: ['Full Access', 'Access Denied', 'Data Entry', 'Read Only'] },
                contactBook: { type: 'string', enum: ['Full Access', 'Access Denied', 'Data Entry', 'Read Only'] },
                logBook: { type: 'string', enum: ['Full Access', 'Access Denied', 'Data Entry', 'Read Only'] },
                reports: { type: 'string', enum: ['Full Access', 'Access Denied', 'Data Entry', 'Read Only'] }
              }
            },
            customPermissions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  module: { type: 'string' },
                  level: { type: 'string', enum: ['Full Access', 'Access Denied', 'Data Entry', 'Read Only'] }
                }
              }
            },
            isActive: { type: 'boolean', default: true }
          }
        },
        UserGroupUpdate: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 2, maxLength: 100 },
            description: { type: 'string', maxLength: 500 },
            permissions: {
              type: 'object',
              properties: {
                clientsAndMatter: { type: 'string', enum: ['Full Access', 'Access Denied', 'Data Entry', 'Read Only'] },
                consultations: { type: 'string', enum: ['Full Access', 'Access Denied', 'Data Entry', 'Read Only'] },
                accounts: { type: 'string', enum: ['Full Access', 'Access Denied', 'Data Entry', 'Read Only'] },
                receiptBook: { type: 'string', enum: ['Full Access', 'Access Denied', 'Data Entry', 'Read Only'] },
                contactBook: { type: 'string', enum: ['Full Access', 'Access Denied', 'Data Entry', 'Read Only'] },
                logBook: { type: 'string', enum: ['Full Access', 'Access Denied', 'Data Entry', 'Read Only'] },
                reports: { type: 'string', enum: ['Full Access', 'Access Denied', 'Data Entry', 'Read Only'] }
              }
            },
            customPermissions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  module: { type: 'string' },
                  level: { type: 'string', enum: ['Full Access', 'Access Denied', 'Data Entry', 'Read Only'] }
                }
              }
            },
            isActive: { type: 'boolean' }
          }
        }
      },
      responses: {
        BadRequestError: {
          description: 'Bad Request',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/BadRequestError'
              }
            }
          }
        },
        UnauthorizedError: {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UnauthorizedError'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Not Found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/NotFoundError'
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/InternalServerError'
              }
            }
          }
        }
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
app.use("/api/orders", orderRoutes)
app.use("/api/invoices", invoiceRoutes);
app.use("/api/credit-notes", creditNotesRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/matters", matterRoutes);
app.use("/api/installments", installmentRoutes);
app.use("/api/time-bills", timeBillRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/heads-up", headsUpRoutes);
app.use("/api/pre-signup-metrics", preSignupMatricRoutes);
app.use("/api/marketing", marketingRoutes);
app.use("/api/currencies", currencyRoutes);
app.use("/api/user-groups", userGroupRoutes);
app.use("/api/financial-statements", financialStatementRoutes)

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
