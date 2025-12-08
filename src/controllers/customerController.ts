import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { Customer } from "../entity/Customer";
import { User } from "../entity/User";
import {
  customerSchema,
  sendCodeSchema,
  verifyOTPSchema,
} from "../utils/validators/inputValidator";
import { Status } from "../entity/Customer";
import bcrypt from "bcryptjs";
import {
  generateOTP,
  sendCompanyRegistrationEmail,
  sendCustomerEmailVerificationCode,
  sendVerificationEmail,
} from "../utils/emailUtils";
import { UserRole } from "../entity/User";
import { uploadFileToS3 } from "../utils/s3Utils";
import { Transaction } from "../entity/Transaction";
import { Subscription } from "../entity/Subscription";
import { Package } from "../entity/Package";
const customerRepo = AppDataSource.getRepository(Customer);
const userRepo = AppDataSource.getRepository(User);
const transactionRepo = AppDataSource.getRepository(Transaction);

const subscriptionRepo = AppDataSource.getRepository(Subscription);
const packageRepo = AppDataSource.getRepository(Package);

/**
 * @swagger
 * /api/customers:
 *   post:
 *     summary: Create a new customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomerInput'
 *     responses:
 *       201:
 *         description: Customer created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
export const createCustomer = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = (req as any).user.id;

    // Validate request body
    const { error, value } = customerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const email = value.email.trim().toLowerCase();

    // Check if a verified customer already exists
    const existingCustomer = await customerRepo.findOne({
      where: { email, isDelete: false },
    });

    if (!existingCustomer) {
      return res.status(400).json({
        success: false,
        message: "Please verify your email before creating a customer.",
      });
    }

    if (!existingCustomer.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is not verified. Please verify email first.",
      });
    }

    // If logo is provided as a file or base64, upload to S3 and get URL
    if (value.logo) {
      const matches = value.logo.match(/^data:(.+);base64,(.*)$/);
      if (!matches) {
        return res.status(400).json({
          success: false,
          message: "Invalid base64 logo format.",
        });
      }

      const mimeType = matches[1];
      const base64Data = matches[2];
      const ext = mimeType.split("/")[1] ? `.${mimeType.split("/")[1]}` : "";
      const buffer = Buffer.from(base64Data, "base64");

      const key = `customers/${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 10)}${ext}`;

      const originalname = `logo${ext}`;

      const s3LogoUrl = await uploadFileToS3({
        bucket: process.env.LOGO_BUCKET || "",
        buffer,
        originalname,
        mimetype: mimeType,
        key,
      });

      value.logo = s3LogoUrl;
    }

    // existing verified customer
    const customer = existingCustomer;

    customer.createdByUserId = userId;
    customer.logo = value.logo || "";
    customer.firstName = value.firstName;
    customer.lastName = value.lastName;
    customer.stage = value.stage;
    customer.churnRisk = value.churnRisk;
    customer.businessName = value.businessName;
    customer.tradingName = value.tradingName;
    customer.note = value.note || "";
    customer.businessSize = value.businessSize;
    customer.businessEntity = value.businessEntity;
    customer.businessType = value.businessType;
    customer.businessAddress = {
      buildingName: value.businessAddress.buildingName,
      buildingNumber: value.businessAddress.buildingNumber,
      street: value.businessAddress.street,
      town: value.businessAddress.town,
      city: value.businessAddress.city,
      country: value.businessAddress.country,
      postalCode: value.businessAddress.postalCode,
    };
    customer.businessWebsite = value.businessWebsite || "";
    customer.referralCode = value.referralCode;
    customer.phoneNumber = value.phoneNumber;
    customer.password = await bcrypt.hash(value.password, 10); // Note: You should hash this password!
    customer.practiceArea = value.practiceArea || [];
    customer.status = value.status as Status;
    customer.expiryDate = value.expiryDate || new Date(); // Default to current date
    customer.isDelete = false;
    customer.updatedAt = new Date();
    customer.lastActive = new Date();

    const savedCustomer = await customerRepo.save(customer);
    // Save the customer
    // Check if user already exists in the user table
    const existingUser = await userRepo.findOne({
      where: { email: customer.email, isDelete: false },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists.",
      });
    }

    // Also create a user record for this customer so they can log in
    const user = new User();
    user.name = savedCustomer.firstName + " " + savedCustomer.lastName;
    user.email = savedCustomer.email;
    user.password = savedCustomer.password; // already hashed above
    user.role = "customer" as UserRole;
    user.isDelete = false;
    user.createdAt = new Date();
    user.updatedAt = new Date();

    const savedUser = await userRepo.save(user);

    // Send email verification to user before allowing login
    const verificationEmailSent = await sendVerificationEmail(
      savedUser.email,
      savedUser.name,
      process.env.FRONTEND_VERIFY_EMAIL_URL ||
        "https://vhr-system.com/verify-email"
    );

    if (!verificationEmailSent) {
      console.warn(`Failed to send verification email to ${savedUser.email}`);
    }

    // Send registration email
    const customerName = `${savedCustomer.firstName} ${savedCustomer.lastName}`;
    const emailSent = await sendCompanyRegistrationEmail(
      savedCustomer.email,
      customerName,
      savedCustomer.businessName,
      process.env.FRONTEND_LOGIN_URL || "https://vhr-system.com/login"
    );

    if (!emailSent) {
      console.warn(
        `Failed to send registration email to ${savedCustomer.email}`
      );
    }

    return res.status(201).json({
      success: true,
      data: savedCustomer,
      message: "Customer created successfully",
      emailSent,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const sendVerificationCode = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { error, value } = sendCodeSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const validEmail = value.email;
    // Check if email already exists in customer table
    const existingCustomer = await customerRepo.findOne({
      where: {
        email: validEmail,
        isDelete: false,
      },
    });

    if (existingCustomer && existingCustomer.isEmailVerified) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered as a customer",
      });
    }

    // Also check if email exists in user table
    const existingUser = await userRepo.findOne({
      where: {
        email: validEmail,
        isDelete: false,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered in the system",
      });
    }

    // Generate verification code
    const verificationCode = generateOTP();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const existingUnverifiedCustomer = await customerRepo.findOne({
      where: {
        email: validEmail,
        isEmailVerified: false,
      },
    });
    if (existingUnverifiedCustomer) {
      // Update existing unverified customer
      existingUnverifiedCustomer.otp = verificationCode;
      existingUnverifiedCustomer.otpExpiry = otpExpiry;
      await customerRepo.save(existingUnverifiedCustomer);
    } else {
      // Create new temporary customer record
      const tempCustomer = new Customer();
      tempCustomer.email = validEmail;
      tempCustomer.otp = verificationCode;
      tempCustomer.otpExpiry = otpExpiry;
      tempCustomer.isEmailVerified = false;

      await customerRepo.save(tempCustomer);
    }

    const emailSent = await sendCustomerEmailVerificationCode(
      validEmail,
      verificationCode
    );

    return res.status(201).json({
      success: true,
      message: "Email Verification Code Sent Successfully",
      emailSent: emailSent,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const verifyEmailCode = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { error, value } = verifyOTPSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const validEmail = value.email.trim();
    const validCode = value.otp;
    // Check if OTP provided
    if (!validCode) {
      return res.status(400).json({
        success: false,
        message: "Verification Code Required",
      });
    }
    // Check if Customer email and otp exist
    const customer = await customerRepo.findOne({
      where: {
        email: validEmail,
        otp: validCode,
        isDelete: false,
      },
    });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer Not Found",
      });
    }
    // Check OTP provided is Correct
    if (customer.otp !== validCode) {
      return res.status(400).json({
        success: false,
        message: "Invalid Verification Code",
      });
    }
    // Check OTP Expiry
    if (!customer.otpExpiry || customer.otpExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Verification Code Expired",
      });
    }
    (customer.isEmailVerified = true),
      (customer.otp = null),
      (customer.otpExpiry = null);

    await customerRepo.save(customer);

    return res.status(201).json({
      success: true,
      message: "Customer Email Verified Sucessfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const checkCustomerExist = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { email } = req.body;
    const customerExist = await customerRepo.findOne({
      where: {
        email: email,
        isDelete: false,
      },
    });
    const userExist = await userRepo.findOne({
      where: {
        email: email,
        isDelete: false,
      },
    });
    if (customerExist || userExist) {
      return res.status(200).json({
        success: true,
        exists: true,
        message: "This Email is already Registered in the system",
      });
    } else {
      return res.status(200).json({
        success: true,
        exists: false,
        message: "Email is available",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
/**
 * @swagger
 * /api/customers/stats:
 *   get:
 *     summary: Get customer statistics
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: Filter by customer status
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filter by year
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *         description: Filter by month
 *     responses:
 *       200:
 *         description: Customer statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalCustomers:
 *                   type: integer
 *                 activeCustomers:
 *                   type: integer
 *                 inactiveCustomers:
 *                   type: integer
 *                 licenseExpiredCustomers:
 *                   type: integer
 *                 totalSubscriptions:
 *                   type: integer
 *                 totalTrials:
 *                   type: integer
 */

export const getCustomerStats = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { state, year, month } = req.query;

    // ✅ Normalize filters
    const filters: Record<string, any> = {};
    if (state && typeof state === "string" && state.trim() !== "")
      filters.state = state;
    if (year && !isNaN(Number(year))) filters.year = Number(year);
    if (month && !isNaN(Number(month))) filters.month = Number(month);

    // ✅ Helper: apply filters to QueryBuilder
    const applyCustomerFilters = (qb: any, alias: string) => {
      qb.andWhere(`${alias}.isDelete = :isDelete`, { isDelete: false });
      if (filters.state)
        qb.andWhere(`${alias}.status = :state`, { state: filters.state });
      if (filters.year)
        qb.andWhere(`YEAR(${alias}.createdAt) = :year`, { year: filters.year });
      if (filters.month)
        qb.andWhere(`MONTH(${alias}.createdAt) = :month`, {
          month: filters.month,
        });
    };

    // ✅ Helper: group customers by year
    const groupByYear = (items: { createdAt?: Date | null }[] = []) => {
      if (!Array.isArray(items)) return {};
      return items.reduce((acc: Record<string, number>, item) => {
        if (!item?.createdAt) return acc;
        const year = new Date(item.createdAt).getFullYear();
        if (!isNaN(year)) acc[year] = (acc[year] || 0) + 1;
        return acc;
      }, {});
    };

    // ✅ Helper: common customer query builder
    const makeCustomerQuery = (statusCondition?: string | string[]) => {
      const qb = customerRepo
        .createQueryBuilder("customer")
        .select(["customer.createdAt"]);
      applyCustomerFilters(qb, "customer");
      if (statusCondition) {
        if (Array.isArray(statusCondition)) {
          qb.andWhere("customer.status IN (:...statuses)", {
            statuses: statusCondition,
          });
        } else {
          qb.andWhere("customer.status = :status", { status: statusCondition });
        }
      }
      return qb.getMany();
    };

    // ✅ Fetch all data in parallel for performance
    const [
      allCustomers,
      activeCustomersArr,
      licenseExpiredCustomersArr,
      inactiveCustomersArr,
      totalTrialsArr,
      revenueStats,
    ] = await Promise.all([
      makeCustomerQuery(), // all
      makeCustomerQuery("Active"),
      makeCustomerQuery("License Expired"),
      makeCustomerQuery(["Trial", "Free", "License Expired"]),
      makeCustomerQuery("Trial"),

      // ✅ Revenue stats (with filters + isDelete)
      Promise.all([
        // Yearly
        transactionRepo.query(`
          SELECT 
            YEAR(createdAt) AS year, 
            COALESCE(SUM(amount), 0) AS netRevenue
          FROM transaction
          WHERE status = 'completed'
          AND isDeleted = false
          ${filters.year ? `AND YEAR(createdAt) = ${filters.year}` : ""}
          ${filters.month ? `AND MONTH(createdAt) = ${filters.month}` : ""}
          GROUP BY year
          ORDER BY year ASC
        `),

        // Quarterly
        transactionRepo.query(`
          SELECT 
            YEAR(createdAt) AS year,
            QUARTER(createdAt) AS quarter,
            COALESCE(SUM(amount), 0) AS netRevenue
          FROM transaction
          WHERE status = 'completed'
          AND isDeleted = false
          ${filters.year ? `AND YEAR(createdAt) = ${filters.year}` : ""}
          ${filters.month ? `AND MONTH(createdAt) = ${filters.month}` : ""}
          GROUP BY year, quarter
          ORDER BY year ASC, quarter ASC
        `),

        // Monthly
        transactionRepo.query(`
          SELECT 
            YEAR(createdAt) AS year,
            MONTH(createdAt) AS month,
            COALESCE(SUM(amount), 0) AS netRevenue
          FROM transaction
          WHERE status = 'completed'
          AND isDeleted = false
          ${filters.year ? `AND YEAR(createdAt) = ${filters.year}` : ""}
          ${filters.month ? `AND MONTH(createdAt) = ${filters.month}` : ""}
          GROUP BY year, month
          ORDER BY year ASC, month ASC
        `),

        // Weekly
        transactionRepo.query(`
          SELECT 
            YEAR(createdAt) AS year,
            WEEK(createdAt) AS week,
            COALESCE(SUM(amount), 0) AS netRevenue
          FROM transaction
          WHERE status = 'completed'
          AND isDeleted = false
          ${filters.year ? `AND YEAR(createdAt) = ${filters.year}` : ""}
          ${filters.month ? `AND MONTH(createdAt) = ${filters.month}` : ""}
          GROUP BY year, week
          ORDER BY year ASC, week ASC
        `),

        // Last 24 hours
        transactionRepo.query(`
          SELECT 
            COALESCE(SUM(amount), 0) AS netRevenue
          FROM transaction
          WHERE status = 'completed'
          AND isDeleted = false
          AND createdAt >= NOW() - INTERVAL 1 DAY
        `),
      ]),
    ]);

    // ✅ Response
    return res.json({
      totalCustomers: groupByYear(allCustomers),
      activeCustomers: groupByYear(activeCustomersArr),
      licenseExpiredCustomers: groupByYear(licenseExpiredCustomersArr),
      inactiveCustomers: groupByYear(inactiveCustomersArr),
      totalTrials: groupByYear(totalTrialsArr),
      netRevenue: {
        yearly: revenueStats[0],
        quarterly: revenueStats[1],
        monthly: revenueStats[2],
        weekly: revenueStats[3],
        last24h: revenueStats[4]?.[0]?.netRevenue || 0,
      },
    });
  } catch (error) {
    console.error("Error in getCustomerStats:", error);
    return res
      .status(500)
      .json({ message: "Error fetching customer stats", error });
  }
};

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Get all customers (paginated)
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc, dsc]
 *         description: Sort order (asc or desc)
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Filter by email (partial match)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter customers created after this date (inclusive)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter customers created before this date (inclusive)
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         description: Filter by customer id (partial or exact)
 *       - in: query
 *         name: stage
 *         schema:
 *           type: string
 *         description: Filter by customer stage
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by customer type
 *       - in: query
 *         name: churnRisk
 *         schema:
 *           type: string
 *         description: Filter by churn risk
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by customer status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter customers created after this date (inclusive)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter customers created before this date (inclusive)
 *     responses:
 *       200:
 *         description: List of customers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Customer'
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalCount:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalItems:
 *                   type: integer
 */
export const getAllCustomers = async (
  req: Request,
  res: Response
): Promise<any> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  let orderParam = (req.query.order as string)?.toLowerCase() || "asc";
  let order: "ASC" | "DESC" =
    orderParam === "dsc" || orderParam === "desc" ? "DESC" : "ASC";

  const email = (req.query.email as string) || "";
  const id = req.query.id as number | undefined;
  const stage = req.query.stage as string | undefined;
  const type = req.query.type as string | undefined;
  const churnRisk = req.query.churnRisk as string | undefined;
  const status = req.query.status as string | undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;

  // Use QueryBuilder for optimized full text search and filtering
  let qb = customerRepo
    .createQueryBuilder("customer")
    .where("customer.isDelete = :isDelete", { isDelete: false });

  if (email) {
    qb.andWhere("customer.email LIKE :email", { email: `%${email}%` });
  }
  if (id) {
    const numericId = Number(id);
    if (!isNaN(numericId) && Number.isFinite(numericId)) {
      qb.andWhere("customer.id = :id", { id: numericId });
    }
  }
  if (stage && stage.trim() !== "") {
    qb = qb.andWhere("LOWER(customer.stage) LIKE :stageFilter", {
      stageFilter: `%${stage.toLowerCase()}%`,
    });
  }
  if (type && type.trim() !== "") {
    qb = qb.andWhere("LOWER(customer.businessType) LIKE :typeFilter", {
      typeFilter: `%${type.toLowerCase()}%`,
    });
  }
  if (typeof churnRisk === "string" && churnRisk.trim() !== "") {
    qb = qb.andWhere("LOWER(customer.churnRisk) LIKE :churnRiskFilter", {
      churnRiskFilter: `%${churnRisk.toLowerCase()}%`,
    });
  }
  if (startDate && endDate) {
    qb = qb.andWhere("customer.createdAt BETWEEN :startDate AND :endDate", {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });
  }
  if (startDate) {
    qb = qb.andWhere("customer.createdAt >= :startDate", {
      startDate: new Date(startDate),
    });
  }
  if (endDate) {
    qb = qb.andWhere("customer.createdAt <= :endDate", {
      endDate: new Date(endDate),
    });
  }
  // if (status) {
  //   // Status is an enum field, so use exact match instead of LIKE
  //   qb = qb.andWhere("customer.status = :statusFilter", { statusFilter: status });
  // }

  // Use QueryBuilder for paginated, filtered, and ordered results
  const [customers, total] = await qb
    .orderBy("customer.createdAt", order)
    .skip((page - 1) * limit)
    .take(limit)
    .getManyAndCount();

  // Get all subscriptions for these customers in one query
  const customerIds = customers.map((c) => c.id);
  let subscriptions: any[] = [];
  if (customerIds.length > 0) {
    subscriptions = await subscriptionRepo
      .createQueryBuilder("subscription")
      .where("subscription.customerId IN (:...customerIds)", { customerIds })
      .andWhere("subscription.isDelete = :isDelete", { isDelete: false })
      .getMany();
  }

  let packages: any[] = [];
  // Get all packageIds from subscriptions
  const packageIds = subscriptions.map((s: any) => s.packageId);
  if (packageIds.length > 0) {
    packages = await packageRepo
      .createQueryBuilder("package")
      .select([
        "package.id",
        "package.name",
        "package.type",
        "package.priceMonthly",
        "package.priceYearly",
      ])
      .where("package.id IN (:...packageIds)", { packageIds })
      .getMany()
      .then((pkgs) =>
        pkgs.map((pkg) => ({
          id: pkg.id,
          name: pkg.name,
          type: pkg.type,
          price: {
            monthly: pkg.priceMonthly,
            yearly: pkg.priceYearly,
          },
        }))
      );
  }

  // Map for quick lookup
  const subscriptionMap = new Map();
  subscriptions.forEach((sub: any) => {
    subscriptionMap.set(sub.customerId, sub);
  });

  const packageMap = new Map();
  packages.forEach((pkg: any) => {
    packageMap.set(pkg.id, pkg);
  });

  // Attach package details to each customer
  const customersWithPackage = customers.map((customer) => {
    const subscription = subscriptionMap.get(customer.id);
    let packageDetails = null;
    if (subscription) {
      packageDetails = packageMap.get(subscription.packageId) || null;
    }
    return {
      ...customer,
      package: packageDetails,
    };
  });

  // Get total count of all customers (not paginated)
  const totalCount = await customerRepo.count();

  return res.json({
    data: customersWithPackage,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    totalItems: total,
    totalCount: totalCount,
  });
};

/**
 * @swagger
 * /api/customers/deleted:
 *   get:
 *     summary: Get all deleted customers with pagination and filters
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Filter by customer email (partial match)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter deleted customers from this date (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter deleted customers up to this date (ISO format)
 *     responses:
 *       200:
 *         description: List of deleted customers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Customer'
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalCount:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalItems:
 *                   type: integer
 *       500:
 *         description: Internal server error
 */
export const getDeletedCustomers = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const email = (req.query.email as string) || "";
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    let orderParam = (req.query.order as string)?.toLowerCase() || "asc";
    let order: "ASC" | "DESC" =
      orderParam === "dsc" || orderParam === "desc" ? "DESC" : "ASC";

    const query = customerRepo
      .createQueryBuilder("customer")
      .where("customer.isDelete = :isDelete", { isDelete: true });

    if (email) {
      query.andWhere("customer.email LIKE :email", { email: `%${email}%` });
    }

    if (startDate) {
      query.andWhere("customer.deletedAt >= :startDate", {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      query.andWhere("customer.deletedAt <= :endDate", {
        endDate: new Date(endDate),
      });
    }

    // Get total filtered count
    const [customers, total] = await query
      .orderBy("customer.deletedAt", order)
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Get total count of all deleted customers (not paginated, not filtered)
    const totalCount = await customerRepo.count({ where: { isDelete: true } });

    return res.status(200).json({
      data: customers,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      totalCount: totalCount,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err instanceof Error ? err.message : err,
    });
  }
};

/**
 * @swagger
 * /api/customers/{id}:
 *   put:
 *     summary: Update customer's practiceArea
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - practiceArea
 *             properties:
 *               practiceArea:
 *                 type: string
 *                 description: The new practice area for the customer
 *     responses:
 *       201:
 *         description: Customer updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Internal server error
 */
export const updateCustomer = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const { practiceArea } = req.body;
    const customer = await customerRepo.findOne({ where: { id: +id } });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Create customer instance
    customer.practiceArea = practiceArea;
    customer.updatedAt = new Date();

    const savedCustomer = await customerRepo.save(customer);

    return res.status(201).json({
      success: true,
      data: savedCustomer,
      message: "Customer updated successfully",
    });
  } catch (error) {
    console.error("Error updating customer:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * @openapi
 * /api/customers/{id}:
 *   get:
 *     summary: Get customer by ID
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       404:
 *         description: Customer not found
 *       403:
 *         description: Access denied
 */
export const getCustomerById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    // Find customer by ID
    const customer = await customerRepo.findOne({
      where: {
        id: +id,
        isDelete: false,
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Check if user has permission to view this customer
    // Super admin can view all customers, regular users can only view their own customers
    const userRole = (req as any).user.role;
    if (userRole !== "super_admin" && customer.createdByUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own customers.",
      });
    }

    // Remove sensitive information before sending response
    const customerData = {
      id: customer.id,
      userId: customer.createdByUserId,
      logo: customer.logo,
      firstName: customer.firstName,
      lastName: customer.lastName,
      businessName: customer.businessName,
      tradingName: customer.tradingName,
      note: customer.note,
      businessSize: customer.businessSize,
      businessEntity: customer.businessEntity,
      businessType: customer.businessType,
      businessAddress: customer.businessAddress,
      phoneNumber: customer.phoneNumber,
      email: customer.email,
      practiceArea: customer.practiceArea,
      status: customer.status,
      expiryDate: customer.expiryDate,
      isDelete: customer.isDelete,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };

    return res.json({
      success: true,
      data: customerData,
      message: "Customer details retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting customer by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * @openapi
 * /api/customers/{customerId}/send-registration-email:
 *   post:
 *     summary: Send registration email to customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               loginUrl:
 *                 type: string
 *                 description: Custom login URL
 *     responses:
 *       200:
 *         description: Registration email sent successfully
 *       404:
 *         description: Customer not found
 *       403:
 *         description: Access denied
 *       500:
 *         description: Internal server error
 */
export const sendRegistrationEmail = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { customerId } = req.params;
    const { loginUrl } = req.body; // Optional custom login URL

    // Find customer by ID
    const customer = await customerRepo.findOne({
      where: {
        id: +customerId,
        isDelete: false,
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Check if user has permission to send email for this customer
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    if (userRole !== "super_admin" && customer.createdByUserId !== userId) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. You can only send emails for your own customers.",
      });
    }

    // Prepare customer name
    const customerName = `${customer.firstName} ${customer.lastName}`;

    // Send registration email
    const emailSent = await sendCompanyRegistrationEmail(
      customer.email,
      customerName,
      customer.businessName,
      loginUrl ||
        process.env.FRONTEND_LOGIN_URL ||
        "https://vhr-system.com/login"
    );

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to send registration email. Please try again.",
      });
    }

    return res.json({
      success: true,
      message: `Registration email sent successfully to ${customer.email}`,
      data: {
        customerId: customer.id,
        customerName: customerName,
        businessName: customer.businessName,
        email: customer.email,
        sentAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Error sending registration email:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * @swagger
 * /api/customers/active-per-year:
 *   get:
 *     summary: Get count of active customers per year (last 3 years)
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active customer stats for the last 3 years
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 currentYear:
 *                   type: integer
 *                   description: The most recent year in the data
 *                 activeCustomers:
 *                   type: integer
 *                   description: Number of active customers in the current year
 *                 percentageChange:
 *                   type: number
 *                   format: float
 *                   description: Percentage change in active customers compared to previous year
 *                 yearlyData:
 *                   type: array
 *                   description: List of yearly active customer counts (sorted ascending by year)
 *                   items:
 *                     type: object
 *                     properties:
 *                       year:
 *                         type: integer
 *                         description: Year
 *                       count:
 *                         type: integer
 *                         description: Number of active customers in that year
 */
export const getActiveCustomersPerYear = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    // Query to get count of active customers grouped by year (ignores null createdAt)
    const result = await customerRepo
      .createQueryBuilder("customer")
      .select("YEAR(customer.createdAt)", "year")
      .addSelect("COUNT(*)", "count")
      .where("customer.status = :status", { status: "Active" })
      .andWhere("customer.isDelete = :isDelete", { isDelete: false })
      .groupBy("YEAR(customer.createdAt)")
      .orderBy("YEAR(customer.createdAt)", "DESC")
      .getRawMany();

    if (!result || result.length === 0) {
      return res.json({
        currentYear: new Date().getFullYear(),
        activeCustomers: 0,
        percentageChange: 0,
        yearlyData: [],
      });
    }

    // Convert safely
    const yearlyData = result
      .filter((r) => r.year && !isNaN(Number(r.year)))
      .map((r) => ({
        year: Number(r.year),
        count: Number(r.count),
      }))
      .sort((a, b) => a.year - b.year);

    // Handle if there are fewer than 2 years of data
    const len = yearlyData.length;
    const currentYear = yearlyData[len - 1]?.year || new Date().getFullYear();
    const currentCount = yearlyData[len - 1]?.count || 0;
    const prevCount = len > 1 ? yearlyData[len - 2].count : 0;

    const percentageChange =
      prevCount > 0
        ? Number((((currentCount - prevCount) / prevCount) * 100).toFixed(1))
        : 0;

    return res.json({
      currentYear,
      activeCustomers: currentCount,
      percentageChange,
      yearlyData,
    });
  } catch (error) {
    console.error("Error in getActiveCustomersPerYear:", error);
    return res.status(500).json({
      message: "Error fetching active customers per year",
      error,
    });
  }
};

/**
 * @swagger
 * /api/customers/total-per-year:
 *   get:
 *     summary: Get total customers per year, quarter, month, week, or day
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: view
 *         schema:
 *           type: string
 *           enum: [yearly, quarterly, monthly, weekly, daily]
 *           default: yearly
 *         description: Aggregation view (yearly, quarterly, monthly, weekly, daily)
 *       - in: query
 *         name: compareYears
 *         schema:
 *           type: string
 *           example: "2023,2024"
 *         description: Comma-separated list of years to compare (e.g. 2023,2024)
 *     responses:
 *       200:
 *         description: Total customers per selected period(s)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 datasets:
 *                   type: object
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       label:
 *                         type: string
 *                         description: Year label (e.g. "2023")
 *                       data:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             x:
 *                               type: string
 *                               description: Period label (month, quarter, day, etc.)
 *                             y:
 *                               type: integer
 *                               description: Customer count for the period
 *       500:
 *         description: Internal server error
 */
export const getTotalCustomersPerYear = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    console.log("getTotalCustomersPerYear");

    const view = (req.query.view as string) || "yearly"; // yearly | quarterly | monthly | weekly | daily
    const currentYear = new Date().getFullYear();
    const compareYears = req.query.compareYears
      ? (req.query.compareYears as string)
          .split(",")
          .map((y) => Number(y.trim()))
      : [currentYear];

    const datasets: Record<
      number,
      { label: string; data: { x: string; y: number }[] }
    > = {};

    // date range helpers
    const getStartOf = (unit: string, year: number = currentYear) => {
      const now = new Date();
      switch (unit) {
        case "year":
          return new Date(year, 0, 1, 0, 0, 0);
        case "month":
          return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        case "week":
          return new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - 7,
            0,
            0,
            0
          );
        case "day":
          return new Date(now.getTime() - 24 * 60 * 60 * 1000);
        default:
          return new Date(year, 0, 1, 0, 0, 0);
      }
    };

    const getEndOf = (unit: string, year: number = currentYear) => {
      const now = new Date();
      switch (unit) {
        case "year":
          return new Date(year, 11, 31, 23, 59, 59);
        case "month":
          return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        case "week":
          return new Date();
        case "day":
          return new Date();
        default:
          return new Date(year, 11, 31, 23, 59, 59);
      }
    };

    for (const year of compareYears) {
      let dateFormat = "MONTHNAME(customer.createdAt)";
      let groupExpr = "MONTH(customer.createdAt)";
      let startDate = getStartOf("year", year);
      let endDate = getEndOf("year", year);

      switch (view.toLowerCase()) {
        case "yearly":
          dateFormat = "MONTHNAME(customer.createdAt)";
          groupExpr = "MONTH(customer.createdAt)";
          break;
        case "quarterly":
          dateFormat = "CONCAT('Q', QUARTER(customer.createdAt))";
          groupExpr = "QUARTER(customer.createdAt)";
          break;
        case "monthly":
          dateFormat = "DAY(customer.createdAt)";
          groupExpr = "DAY(customer.createdAt)";
          startDate = getStartOf("month");
          endDate = getEndOf("month");
          break;
        case "weekly":
          dateFormat = "DAYNAME(customer.createdAt)";
          groupExpr = "DAYOFWEEK(customer.createdAt)";
          startDate = getStartOf("week");
          endDate = getEndOf("week");
          break;
        case "daily":
        case "24hours":
          dateFormat = "HOUR(customer.createdAt)";
          groupExpr = "HOUR(customer.createdAt)";
          startDate = getStartOf("day");
          endDate = getEndOf("day");
          break;
      }

      const rawData = await customerRepo
        .createQueryBuilder("customer")
        .select(`${dateFormat}`, "label")
        .addSelect("COUNT(*)", "count")
        .where("customer.isDelete = :isDelete", { isDelete: false })
        .andWhere("YEAR(customer.createdAt) = :year", { year })
        .andWhere("customer.createdAt BETWEEN :startDate AND :endDate", {
          startDate,
          endDate,
        })
        .groupBy(groupExpr)
        .orderBy(groupExpr, "ASC")
        .getRawMany();

      const formattedData = rawData.map((r: any) => ({
        x: r.label,
        y: Number(r.count),
      }));

      datasets[year] = {
        label: year.toString(),
        data: formattedData,
      };
    }

    // Compute totals and growth
    const latestYear = Math.max(...compareYears);
    const total =
      datasets[latestYear]?.data.reduce((sum, d) => sum + d.y, 0) || 0;
    const prevYear = latestYear - 1;
    const prevTotal =
      datasets[prevYear]?.data.reduce((sum, d) => sum + d.y, 0) || 0;
    const growth = prevTotal ? ((total - prevTotal) / prevTotal) * 100 : 0;

    return res.status(200).json({
      totalCustomers: total,
      growthPercentage: Number(growth.toFixed(2)),
      datasets,
    });
  } catch (error) {
    console.error("Error in getTotalCustomersPerYear:", error);
    return res.status(500).json({
      message: "Error fetching total customers per year",
      error: error instanceof Error ? error.message : error,
    });
  }
};

/**
 * @swagger
 * /api/customers/revenue-trend:
 *   get:
 *     summary: Get revenue trend per year (with growth)
 *     description: Returns the total number of customers for each year (or other time view), including growth percentage and datasets for charting.
 *     tags:
 *       - Customers
 *     parameters:
 *       - in: query
 *         name: view
 *         schema:
 *           type: string
 *           enum: [yearly, quarterly, monthly, weekly, 24hours]
 *         description: The time view for grouping results (default is yearly)
 *       - in: query
 *         name: compareYears
 *         schema:
 *           type: string
 *         description: Comma-separated list of years to compare (e.g., "2023,2024")
 *     responses:
 *       200:
 *         description: Total customers and growth data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalRevenue:
 *                   type: integer
 *                   description: Total number of customers for the latest year
 *                 growthPercentage:
 *                   type: number
 *                   format: float
 *                   description: Growth percentage compared to previous year
 *                 datasets:
 *                   type: object
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       label:
 *                         type: string
 *                       data:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             x:
 *                               type: string
 *                             y:
 *                               type: integer
 *       500:
 *         description: Error fetching revenue trend per year
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */
export const getRevenueTrend = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    console.log("getRevenueTrend");

    const view = (req.query.view as string) || "yearly"; // yearly | quarterly | monthly | weekly | 24hours
    const currentYear = new Date().getFullYear();

    const compareYears = req.query.compareYears
      ? (req.query.compareYears as string)
          .split(",")
          .map((y) => Number(y.trim()))
      : [currentYear];

    const datasets: Record<
      number,
      { label: string; data: { x: string; y: number }[] }
    > = {};

    // 🧭 Helper functions for date ranges
    const getStartOf = (unit: string, year: number = currentYear) => {
      const now = new Date();
      switch (unit) {
        case "year":
          return new Date(year, 0, 1, 0, 0, 0);
        case "month":
          return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        case "week":
          return new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - 7,
            0,
            0,
            0
          );
        case "day":
          return new Date(now.getTime() - 24 * 60 * 60 * 1000);
        default:
          return new Date(year, 0, 1, 0, 0, 0);
      }
    };

    const getEndOf = (unit: string, year: number = currentYear) => {
      const now = new Date();
      switch (unit) {
        case "year":
          return new Date(year, 11, 31, 23, 59, 59);
        case "month":
          return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        case "week":
          return new Date();
        case "day":
          return new Date();
        default:
          return new Date(year, 11, 31, 23, 59, 59);
      }
    };

    for (const year of compareYears) {
      let dateFormat = "MONTHNAME(transaction.transactionDate)";
      let groupExpr = "MONTH(transaction.transactionDate)";
      let startDate = getStartOf("year", year);
      let endDate = getEndOf("year", year);

      switch (view.toLowerCase()) {
        case "yearly":
          dateFormat = "MONTHNAME(transaction.transactionDate)";
          groupExpr = "MONTH(transaction.transactionDate)";
          break;
        case "quarterly":
          dateFormat = "CONCAT('Q', QUARTER(transaction.transactionDate))";
          groupExpr = "QUARTER(transaction.transactionDate)";
          break;
        case "monthly":
          dateFormat = "DAY(transaction.transactionDate)";
          groupExpr = "DAY(transaction.transactionDate)";
          startDate = getStartOf("month");
          endDate = getEndOf("month");
          break;
        case "weekly":
          dateFormat = "DAYNAME(transaction.transactionDate)";
          groupExpr = "DAYOFWEEK(transaction.transactionDate)";
          startDate = getStartOf("week");
          endDate = getEndOf("week");
          break;
        case "24hours":
          dateFormat = "HOUR(transaction.transactionDate)";
          groupExpr = "HOUR(transaction.transactionDate)";
          startDate = getStartOf("day");
          endDate = getEndOf("day");
          break;
      }

      const rawData = await transactionRepo
        .createQueryBuilder("transaction")
        .select(`${dateFormat}`, "label")
        .addSelect("COALESCE(SUM(transaction.amount), 0)", "revenue")
        .where("transaction.isDeleted = :isDeleted", { isDeleted: false })
        .andWhere("transaction.status = :status", { status: "completed" })
        .andWhere("YEAR(transaction.transactionDate) = :year", { year })
        .andWhere(
          "transaction.transactionDate BETWEEN :startDate AND :endDate",
          {
            startDate,
            endDate,
          }
        )
        .groupBy(groupExpr)
        .orderBy(groupExpr, "ASC")
        .getRawMany();

      const formattedData = rawData.map((r: any) => ({
        x: r.label,
        y: Number(r.revenue),
      }));

      datasets[year] = {
        label: year.toString(),
        data: formattedData,
      };
    }

    // 📈 Totals & growth calculation
    const latestYear = Math.max(...compareYears);
    const total =
      datasets[latestYear]?.data.reduce((sum, d) => sum + d.y, 0) || 0;
    const prevYear = latestYear - 1;
    const prevTotal =
      datasets[prevYear]?.data.reduce((sum, d) => sum + d.y, 0) || 0;
    const growth = prevTotal ? ((total - prevTotal) / prevTotal) * 100 : 0;

    return res.status(200).json({
      totalRevenue: Number(total.toFixed(2)),
      growthPercentage: Number(growth.toFixed(2)),
      datasets,
    });
  } catch (error) {
    console.error("Error in getRevenueTrend:", error);
    return res.status(500).json({
      message: "Error fetching revenue trends",
      error: error instanceof Error ? error.message : error,
    });
  }
};
