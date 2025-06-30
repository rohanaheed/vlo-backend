import { Request, Response } from 'express';
import { AppDataSource } from '../config/db';
import { Customer } from '../entity/Customer';
import { customerSchema } from '../utils/validators/inputValidator';
import { Status } from '../entity/Customer';
import bcrypt from 'bcryptjs';
import { IsNull, Not } from 'typeorm';
import { sendCompanyRegistrationEmail } from '../utils/emailUtils';

const customerRepo = AppDataSource.getRepository(Customer);

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

    // Create customer instance
    const customer = new Customer();
    customer.firstName = value.firstName;
    customer.lastName = value.lastName;
    customer.businessName = value.businessName;
    customer.tradingName = value.tradingName;
    customer.note = value.note || '';
    customer.businessSize = value.businessSize;
    customer.businessEntity = value.businessEntity;
    customer.businessType = value.businessType;
    customer.phoneNumber = value.phoneNumber;
    customer.email = value.email;
    customer.password = await bcrypt.hash(value.password, 10); // Note: You should hash this password!
    customer.status = value.status as Status;
    customer.expirayDate = value.expirayDate || new Date(); // Default to current date
    customer.isDelete = false;
    customer.createdAt = new Date();
    customer.updatedAt = new Date();
    customer.userId = userId;

    const savedCustomer = await customerRepo.save(customer);

    // Send registration email
    const customerName = `${savedCustomer.firstName} ${savedCustomer.lastName}`;
    const emailSent = await sendCompanyRegistrationEmail(
      savedCustomer.email,
      customerName,
      savedCustomer.businessName,
      savedCustomer.subscription,
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
    console.error('Error creating customer:', error);
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
 */
export const getCustomerStats = async (req: Request, res: Response): Promise<any> => {

  const totalCustomers = await customerRepo.count();
  const activeCustomers = await customerRepo.count({ where: { status: "Active" } });
  const licenseExpiredCustomers = await customerRepo.count({ where: { status: "License Expired" } });
  const inactiveCustomers = await customerRepo.count({
    where: [{ status: "Trial" }, { status: "Free" }, { status: "License Expired" }]
  });

  const totalSubscriptions = await customerRepo.count({ where: { packageId: Not(IsNull()) } });

  return res.json({
    totalCustomers,
    activeCustomers,
    inactiveCustomers,
    licenseExpiredCustomers,
    totalSubscriptions,
  });
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
 *                 totalPages:
 *                   type: integer
 *                 totalItems:
 *                   type: integer
 */
export const getAllCustomers = async (req: Request, res: Response): Promise<any> => {

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  const [customers, total] = await customerRepo.findAndCount({
    skip: (page - 1) * limit,
    take: limit,
    order: {
      createdAt: "DESC",
    },
    relations: ["subscriptions"], // if you want to include related subscriptions
  });

  return res.json({
    data: customers,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    totalItems: total,
  });
};

/**
 * @swagger
 * /api/customers/{id}:
 *   put:
 *     summary: Update a customer
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
 *             $ref: '#/components/schemas/CustomerInput'
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
    if (userRole !== "super_admin" && customer.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own customers."
      });
    }

    // Remove sensitive information before sending response
    const customerData = {
      id: customer.id,
      userId: customer.userId,
      logo: customer.logo,
      firstName: customer.firstName,
      lastName: customer.lastName,
      businessName: customer.businessName,
      tradingName: customer.tradingName,
      subscription: customer.subscription,
      note: customer.note,
      businessSize: customer.businessSize,
      businessEntity: customer.businessEntity,
      businessType: customer.businessType,
      businessAddress: customer.businessAddress,
      phoneNumber: customer.phoneNumber,
      email: customer.email,
      practiceArea: customer.practiceArea,
      status: customer.status,
      expirayDate: customer.expirayDate,
      packageId: customer.packageId,
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
    if (userRole !== "super_admin" && customer.userId !== userId) {
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
      customer.subscription,
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