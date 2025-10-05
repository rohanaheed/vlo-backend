import { Request, Response } from 'express';
import { AppDataSource } from '../config/db';
import { Customer } from '../entity/Customer';
import { User } from '../entity/User';
import { customerSchema } from '../utils/validators/inputValidator';
import { Status } from '../entity/Customer';
import bcrypt from 'bcryptjs';
import { sendCompanyRegistrationEmail, sendVerificationEmail } from '../utils/emailUtils';
import { UserRole } from '../entity/User';
import { uploadFileToS3 } from '../utils/s3Utils';
import { Transaction } from '../entity/Transaction';
import { Subscription } from '../entity/Subscription';
import { Package } from '../entity/Package';

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
export const createCustomer = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.id;
    // Validate request body
    const { error, value } = customerSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // If logo is provided as a file or base64, upload to S3 and get URL
    if (value.logo) {
        // value.logo is a base64 string, so extract mime type and extension
        const matches = value.logo.match(/^data:(.+);base64,(.*)$/);
        if (!matches) {
            return res.status(400).json({
                success: false,
                message: 'Invalid base64 logo format.'
            });
        }
        const mimeType = matches[1];
        const base64Data = matches[2];
        const ext = mimeType.split('/')[1] ? `.${mimeType.split('/')[1]}` : '';
        const buffer = Buffer.from(base64Data, 'base64');
        const key = `customers/${Date.now()}_${Math.random().toString(36).substring(2, 10)}${ext}`;
        const originalname = `logo${ext}`;
        const s3LogoUrl = await uploadFileToS3({
          bucket: process.env.LOGO_BUCKET || '',
          buffer: buffer,
          originalname: originalname,
          mimetype: mimeType,
          key: key
        });
        value.logo = s3LogoUrl;
    }

    

    // Create customer instance
    const customer = new Customer();
    customer.createdByUserId = userId;
    customer.logo = value.logo || '';
    customer.firstName = value.firstName;
    customer.lastName = value.lastName;
    customer.stage = value.stage;
    customer.churnRisk = value.churnRisk;
    customer.businessName = value.businessName;
    customer.tradingName = value.tradingName;
    customer.note = value.note || '';
    customer.businessSize = value.businessSize;
    customer.businessEntity = value.businessEntity;
    customer.businessType = value.businessType;
    customer.businessAddress = value.businessAddress || '';
    customer.phoneNumber = value.phoneNumber;
    customer.email = value.email;
    customer.password = await bcrypt.hash(value.password, 10); // Note: You should hash this password!
    customer.practiceArea = value.practiceArea || [];
    customer.status = value.status as Status;
    customer.expiryDate = value.expiryDate || new Date(); // Default to current date
    customer.isDelete = false;
    customer.createdAt = new Date();
    customer.updatedAt = new Date();
    customer.lastActive = new Date();

    const savedCustomer = await customerRepo.save(customer);
    // Save the customer
    // Check if user already exists in the user table
    const existingUser = await userRepo.findOne({ where: { email: customer.email, isDelete: false } });
    if (existingUser) {
      return console.warn({
        success: false,
        message: 'A user with this email already exists.'
      });
    }

    // Also create a user record for this customer so they can log in
    const user = new User();
    user.name = savedCustomer.firstName + " " + savedCustomer.lastName;
    user.email = savedCustomer.email;
    user.password = savedCustomer.password; // already hashed above
    user.role = 'customer' as UserRole; // or whatever role you use for customers
    user.isDelete = false;
    user.createdAt = new Date();
    user.updatedAt = new Date();

    const savedUser = await userRepo.save(user);

    // Send email verification to user before allowing login
    const verificationEmailSent = await sendVerificationEmail(
      savedUser.email,
      savedUser.name,
      process.env.FRONTEND_VERIFY_EMAIL_URL || 'https://vhr-system.com/verify-email'
    );

    if (!verificationEmailSent) {
      console.warn(`Failed to send verification email to ${savedUser.email} for user ${savedUser.id}`);
    }
    // Send registration email
    const customerName = `${savedCustomer.firstName} ${savedCustomer.lastName}`;
    const emailSent = await sendCompanyRegistrationEmail(
      savedCustomer.email,
      customerName,
      savedCustomer.businessName,
      process.env.FRONTEND_LOGIN_URL || 'https://vhr-system.com/login'
    );

    // Log email status (don't fail the request if email fails)
    if (!emailSent) {
      console.warn(`Failed to send registration email to ${savedCustomer.email} for customer ${savedCustomer.id}`);
    }

    return res.status(201).json({
      success: true,
      data: savedCustomer,
      message: 'Customer created successfully',
      emailSent: emailSent
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
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

export const getCustomerStats = async (req: Request, res: Response): Promise<any> => {
  try {
    const { state, year, month } = req.query;

    // ✅ Normalize filters
    const filters: Record<string, any> = {};
    if (state && typeof state === "string" && state.trim() !== "") filters.state = state;
    if (year && !isNaN(Number(year))) filters.year = Number(year);
    if (month && !isNaN(Number(month))) filters.month = Number(month);

    // ✅ Helper: apply filters to QueryBuilder
    const applyCustomerFilters = (qb: any, alias: string) => {
      qb.andWhere(`${alias}.isDelete = :isDelete`, { isDelete: false });
      if (filters.state) qb.andWhere(`${alias}.status = :state`, { state: filters.state });
      if (filters.year) qb.andWhere(`YEAR(${alias}.createdAt) = :year`, { year: filters.year });
      if (filters.month) qb.andWhere(`MONTH(${alias}.createdAt) = :month`, { month: filters.month });
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
      const qb = customerRepo.createQueryBuilder("customer").select(["customer.createdAt"]);
      applyCustomerFilters(qb, "customer");
      if (statusCondition) {
        if (Array.isArray(statusCondition)) {
          qb.andWhere("customer.status IN (:...statuses)", { statuses: statusCondition });
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
      revenueStats
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
        `)
      ])
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
    return res.status(500).json({ message: "Error fetching customer stats", error });
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
export const getAllCustomers = async (req: Request, res: Response): Promise<any> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  let orderParam = (req.query.order as string)?.toLowerCase() || "asc";
  let order: "ASC" | "DESC" = orderParam === "dsc" || orderParam === "desc" ? "DESC" : "ASC";



  const email = (req.query.email as string) || '';
  const id = req.query.id as string | undefined;
  const stage = req.query.stage as string | undefined;
  const type = req.query.type as string | undefined;
  const churnRisk = req.query.churnRisk as string | undefined;
  const status = req.query.status as string | undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
 

  // Use QueryBuilder for optimized full text search and filtering
  let qb = customerRepo.createQueryBuilder("customer")
    .where("customer.isDelete = :isDelete", { isDelete: false });

  if (email) {
    qb.andWhere('customer.email LIKE :email', { email: `%${email}%` });
  }
  if (id && !isNaN(Number(id))) {
    qb = qb.andWhere("customer.id = :id", { id: id });
  }
  if (stage && stage.trim() !== "") {
    qb = qb.andWhere("LOWER(customer.stage) LIKE :stageFilter", { stageFilter: `%${stage.toLowerCase()}%` });
  }
  if (type && type.trim() !== "") {
    qb = qb.andWhere("LOWER(customer.businessType) LIKE :typeFilter", { typeFilter: `%${type.toLowerCase()}%` });
  }
  if (typeof churnRisk === "string" && churnRisk.trim() !== "") {
    qb = qb.andWhere("LOWER(customer.churnRisk) LIKE :churnRiskFilter", { churnRiskFilter: `%${churnRisk.toLowerCase()}%` });
  }
  if(startDate && endDate) {
    qb = qb.andWhere("customer.createdAt BETWEEN :startDate AND :endDate", { startDate: new Date(startDate), endDate: new Date(endDate) });
  }
  if(startDate) {
    qb = qb.andWhere("customer.createdAt >= :startDate", { startDate: new Date(startDate) });
  }
  if(endDate) {
    qb = qb.andWhere("customer.createdAt <= :endDate", { endDate: new Date(endDate) });
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
  const customerIds = customers.map(c => c.id);
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
      .then(pkgs =>
        pkgs.map(pkg => ({
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
  const customersWithPackage = customers.map(customer => {
    const subscription = subscriptionMap.get(customer.id);
    let packageDetails = null;
    if (subscription) {
      packageDetails = packageMap.get(subscription.packageId) || null;
    }
    return {
      ...customer,
      package: packageDetails
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
export const getDeletedCustomers = async (req: Request, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const email = (req.query.email as string) || '';
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    let orderParam = (req.query.order as string)?.toLowerCase() || "asc";
    let order: "ASC" | "DESC" = orderParam === "dsc" || orderParam === "desc" ? "DESC" : "ASC";


    const query = customerRepo.createQueryBuilder('customer')
      .where('customer.isDelete = :isDelete', { isDelete: true });

    if (email) {
      query.andWhere('customer.email LIKE :email', { email: `%${email}%` });
    }

    if (startDate) {
      query.andWhere('customer.deletedAt >= :startDate', { startDate: new Date(startDate) });
    }

    if (endDate) {
      query.andWhere('customer.deletedAt <= :endDate', { endDate: new Date(endDate) });
    }

    // Get total filtered count
    const [customers, total] = await query
      .orderBy('customer.deletedAt', order)
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
      message: 'Internal server error',
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
export const updateCustomer = async (req: Request, res: Response): Promise<any> => {
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
      message: 'Customer updated successfully'
    });

  } catch (error) {
    console.error('Error updating customer:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
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
export const getCustomerById = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    // Find customer by ID
    const customer = await customerRepo.findOne({
      where: { 
        id: +id,
        isDelete: false
      }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    // Check if user has permission to view this customer
    // Super admin can view all customers, regular users can only view their own customers
    const userRole = (req as any).user.role;
    if (userRole !== "super_admin" && customer.createdByUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own customers."
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
      updatedAt: customer.updatedAt
    };

    return res.json({
      success: true,
      data: customerData,
      message: 'Customer details retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting customer by ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
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
export const sendRegistrationEmail = async (req: Request, res: Response): Promise<any> => {
  try {
    const { customerId } = req.params;
    const { loginUrl } = req.body; // Optional custom login URL

    // Find customer by ID
    const customer = await customerRepo.findOne({
      where: { 
        id: +customerId,
        isDelete: false
      }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    // Check if user has permission to send email for this customer
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    if (userRole !== "super_admin" && customer.createdByUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only send emails for your own customers."
      });
    }

    // Prepare customer name
    const customerName = `${customer.firstName} ${customer.lastName}`;
    
    // Send registration email
    const emailSent = await sendCompanyRegistrationEmail(
      customer.email,
      customerName,
      customer.businessName,
      loginUrl || process.env.FRONTEND_LOGIN_URL || 'https://vhr-system.com/login'
    );

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to send registration email. Please try again."
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
        sentAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error sending registration email:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};




