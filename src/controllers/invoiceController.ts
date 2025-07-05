import { Request, Response } from 'express';
import { AppDataSource } from '../config/db';
import { Invoice } from '../entity/Invioce';
import { Customer } from '../entity/Customer';
import { Currency } from '../entity/Currency';
import { Order } from '../entity/Order';
import { invoiceSchema, updateInvoiceSchema } from '../utils/validators/inputValidator';
import { IsNull, Not, Between } from 'typeorm';

const invoiceRepo = AppDataSource.getRepository(Invoice);
const customerRepo = AppDataSource.getRepository(Customer);
const currencyRepo = AppDataSource.getRepository(Currency);
const orderRepo = AppDataSource.getRepository(Order);

/**
 * @swagger
 * /api/invoices:
 *   post:
 *     summary: Create a new invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - invoiceNumber
 *               - amount
 *               - plan
 *               - customerId
 *               - currencyId
 *               - orderId
 *             properties:
 *               invoiceNumber:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *               amount:
 *                 type: number
 *                 minimum: 0
 *               status:
 *                 type: string
 *                 enum: [draft, sent, paid, overdue, cancelled, partialyPaid, disputed, reminder, resend, void, viewed, unpaid]
 *                 default: draft
 *               paymentStatus:
 *                 type: string
 *                 enum: [pending, paid, failed, refunded]
 *                 default: pending
 *               plan:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               customerId:
 *                 type: integer
 *                 minimum: 1
 *               currencyId:
 *                 type: integer
 *                 minimum: 1
 *               orderId:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       201:
 *         description: Invoice created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Invoice'
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       404:
 *         description: Customer, Currency, or Order not found
 *       500:
 *         description: Internal server error
 */
export const createInvoice = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.id;

    // Validate request body
    const { error, value } = invoiceSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // Check if customer exists
    const customer = await customerRepo.findOne({ where: { id: value.customerId, isDelete: false } });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check if currency exists
    const currency = await currencyRepo.findOne({ where: { id: value.currencyId } });
    if (!currency) {
      return res.status(404).json({
        success: false,
        message: 'Currency not found'
      });
    }

    // Check if order exists
    const order = await orderRepo.findOne({ where: { id: value.orderId } });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if invoice number already exists
    const existingInvoice = await invoiceRepo.findOne({ 
      where: { invoiceNumber: value.invoiceNumber, isDelete: false } 
    });
    if (existingInvoice) {
      return res.status(400).json({
        success: false,
        message: 'Invoice number already exists'
      });
    }

    // Create invoice instance
    const invoice = new Invoice();
    invoice.invoiceNumber = value.invoiceNumber;
    invoice.amount = value.amount;
    invoice.status = value.status;
    invoice.paymentStatus = value.paymentStatus;
    invoice.plan = value.plan;
    invoice.customerId = value.customerId;
    invoice.currencyId = value.currencyId;
    invoice.orderId = value.orderId;
    invoice.isDelete = false;

    const savedInvoice = await invoiceRepo.save(invoice);

    return res.status(201).json({
      success: true,
      data: savedInvoice,
      message: 'Invoice created successfully'
    });

  } catch (error) {
    console.error('Error creating invoice:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/invoices:
 *   get:
 *     summary: Get all invoices (paginated)
 *     tags: [Invoices]
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
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by invoice status
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *         description: Filter by payment status
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: integer
 *         description: Filter by customer ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date
 *     responses:
 *       200:
 *         description: List of invoices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Invoice'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *       500:
 *         description: Internal server error
 */
export const getAllInvoices = async (req: Request, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const paymentStatus = req.query.paymentStatus as string;
    const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : null;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    // Build where conditions
    const whereConditions: any = { isDelete: false };

    if (status) {
      whereConditions.status = status;
    }

    if (paymentStatus) {
      whereConditions.paymentStatus = paymentStatus;
    }

    if (customerId) {
      whereConditions.customerId = customerId;
    }

    if (startDate && endDate) {
      whereConditions.createdAt = Between(new Date(startDate), new Date(endDate));
    }

    const [invoices, total] = await invoiceRepo.findAndCount({
      where: whereConditions,
      skip: (page - 1) * limit,
      take: limit,
      order: {
        createdAt: "DESC"
      },
      relations: ['customer', 'currency', 'order']
    });

    const totalPages = Math.ceil(total / limit);

    return res.json({
      success: true,
      data: invoices,
      pagination: {
        page,
        limit,
        totalPages,
        totalItems: total
      }
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/invoices/{id}:
 *   get:
 *     summary: Get invoice by ID
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Invoice details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Invoice'
 *       404:
 *         description: Invoice not found
 *       500:
 *         description: Internal server error
 */
export const getInvoiceById = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const invoice = await invoiceRepo.findOne({
      where: { id: parseInt(id), isDelete: false },
      relations: ['customer', 'currency', 'order']
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    return res.json({
      success: true,
      data: invoice
    });

  } catch (error) {
    console.error('Error fetching invoice:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/invoices/{id}:
 *   put:
 *     summary: Update invoice by ID
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Invoice ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               invoiceNumber:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *               amount:
 *                 type: number
 *                 minimum: 0
 *               status:
 *                 type: string
 *                 enum: [draft, sent, paid, overdue, cancelled, partialyPaid, disputed, reminder, resend, void, viewed, unpaid]
 *               paymentStatus:
 *                 type: string
 *                 enum: [pending, paid, failed, refunded]
 *               plan:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               customerId:
 *                 type: integer
 *                 minimum: 1
 *               currencyId:
 *                 type: integer
 *                 minimum: 1
 *               orderId:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Invoice updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Invoice'
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       404:
 *         description: Invoice not found
 *       500:
 *         description: Internal server error
 */
export const updateInvoice = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error, value } = updateInvoiceSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // Check if invoice exists
    const existingInvoice = await invoiceRepo.findOne({
      where: { id: parseInt(id), isDelete: false }
    });

    if (!existingInvoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Check if new invoice number already exists (if being updated)
    if (value.invoiceNumber && value.invoiceNumber !== existingInvoice.invoiceNumber) {
      const duplicateInvoice = await invoiceRepo.findOne({
        where: { invoiceNumber: value.invoiceNumber, isDelete: false }
      });
      if (duplicateInvoice) {
        return res.status(400).json({
          success: false,
          message: 'Invoice number already exists'
        });
      }
    }

    // Validate related entities if being updated
    if (value.customerId) {
      const customer = await customerRepo.findOne({ where: { id: value.customerId, isDelete: false } });
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }
    }

    if (value.currencyId) {
      const currency = await currencyRepo.findOne({ where: { id: value.currencyId } });
      if (!currency) {
        return res.status(404).json({
          success: false,
          message: 'Currency not found'
        });
      }
    }

    if (value.orderId) {
      const order = await orderRepo.findOne({ where: { id: value.orderId } });
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
    }

    // Update invoice
    Object.assign(existingInvoice, value);
    existingInvoice.updatedAt = new Date();

    const updatedInvoice = await invoiceRepo.save(existingInvoice);

    return res.json({
      success: true,
      data: updatedInvoice,
      message: 'Invoice updated successfully'
    });

  } catch (error) {
    console.error('Error updating invoice:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/invoices/{id}:
 *   delete:
 *     summary: Delete invoice by ID (soft delete)
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Invoice deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Invoice not found
 *       500:
 *         description: Internal server error
 */
export const deleteInvoice = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const invoice = await invoiceRepo.findOne({
      where: { id: parseInt(id), isDelete: false }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Soft delete
    invoice.isDelete = true;
    invoice.updatedAt = new Date();

    await invoiceRepo.save(invoice);

    return res.json({
      success: true,
      message: 'Invoice deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting invoice:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/invoices/stats:
 *   get:
 *     summary: Get invoice statistics
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Invoice statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalInvoices:
 *                       type: integer
 *                     totalAmount:
 *                       type: number
 *                     paidInvoices:
 *                       type: integer
 *                     unpaidInvoices:
 *                       type: integer
 *                     overdueInvoices:
 *                       type: integer
 *                     draftInvoices:
 *                       type: integer
 *                     cancelledInvoices:
 *                       type: integer
 *       500:
 *         description: Internal server error
 */
export const getInvoiceStats = async (req: Request, res: Response): Promise<any> => {
  try {
    const totalInvoices = await invoiceRepo.count({ where: { isDelete: false } });
    const paidInvoices = await invoiceRepo.count({ where: { status: 'paid', isDelete: false } });
    const unpaidInvoices = await invoiceRepo.count({ where: { status: 'unpaid', isDelete: false } });
    const overdueInvoices = await invoiceRepo.count({ where: { status: 'overdue', isDelete: false } });
    const draftInvoices = await invoiceRepo.count({ where: { status: 'draft', isDelete: false } });
    const cancelledInvoices = await invoiceRepo.count({ where: { status: 'cancelled', isDelete: false } });

    // Calculate total amount
    const invoices = await invoiceRepo.find({ where: { isDelete: false } });
    const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);

    return res.json({
      success: true,
      data: {
        totalInvoices,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        paidInvoices,
        unpaidInvoices,
        overdueInvoices,
        draftInvoices,
        cancelledInvoices
      }
    });

  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/invoices/customer/{customerId}:
 *   get:
 *     summary: Get invoices by customer ID
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer ID
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
 *         description: Customer invoices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Invoice'
 *                 pagination:
 *                   type: object
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Internal server error
 */
export const getInvoicesByCustomer = async (req: Request, res: Response): Promise<any> => {
  try {
    const { customerId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Check if customer exists
    const customer = await customerRepo.findOne({ where: { id: parseInt(customerId), isDelete: false } });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const [invoices, total] = await invoiceRepo.findAndCount({
      where: { customerId: parseInt(customerId), isDelete: false },
      skip: (page - 1) * limit,
      take: limit,
      order: {
        createdAt: "DESC"
      },
      relations: ['currency', 'order']
    });

    const totalPages = Math.ceil(total / limit);

    return res.json({
      success: true,
      data: invoices,
      pagination: {
        page,
        limit,
        totalPages,
        totalItems: total
      }
    });

  } catch (error) {
    console.error('Error fetching customer invoices:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
