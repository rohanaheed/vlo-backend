import { Request, Response } from 'express';
import { AppDataSource } from '../config/db';
import { Invoice } from '../entity/Invioce';
import { Customer } from '../entity/Customer';
import { Currency } from '../entity/Currency';
import { Order } from '../entity/Order';
import { invoiceSchema, updateInvoiceSchema } from '../utils/validators/inputValidator';
import { Between } from 'typeorm';
import { uploadFileToS3, removeFileFromS3 } from '../utils/s3Utils';

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
    // Extend req type to include file property
    const reqWithFile = req as Request & { file?: { buffer: Buffer, originalname: string, mimetype: string } };

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

    // Create invoice instance according to Invoice entity
    const invoice = new Invoice();
    invoice.invoiceNumber = value.invoiceNumber;
    invoice.amount = value.amount;
    invoice.status = value.status || "draft";
    invoice.paymentStatus = value.paymentStatus || "unpaid";
    invoice.plan = value.plan || "";
    invoice.customerId = value.customerId;
    invoice.currencyId = value.currencyId;
    invoice.orderId = value.orderId;
    invoice.dueDate = value.dueDate || "";
    invoice.referenceNumber = value.referenceNumber || "";
    invoice.priority = value.priority || "";
    invoice.discount = value.discount || "";
    invoice.vat = value.vat || "";
    invoice.discountType = value.discountType || "";
    invoice.subTotal = value.subTotal || "";
    invoice.outstandingBalance = value.outstandingBalance || "";
    invoice.recurring = value.recurring || "";
    invoice.recurringInterval = value.recurringInterval || "";
    invoice.recurringCount = value.recurringCount || "";
    invoice.isDelete = false;

    // Handle invoice file upload to S3 if file is present
    if (reqWithFile.file && reqWithFile.file.buffer && reqWithFile.file.originalname && reqWithFile.file.mimetype) {
      const s3Url = await uploadFileToS3({
        buffer: reqWithFile.file.buffer,
        originalname: reqWithFile.file.originalname,
        mimetype: reqWithFile.file.mimetype
      });
      invoice.invoiceFile = s3Url;
    } else {
      invoice.invoiceFile = "";
    }

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
    // Extend req type to include file property
    const reqWithFile = req as Request & { file?: { buffer: Buffer, originalname: string, mimetype: string } };
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
    // Handle invoice file replacement in S3 if new file is present
    if (reqWithFile.file && reqWithFile.file.buffer && reqWithFile.file.originalname && reqWithFile.file.mimetype) {
      // If there is an existing file, remove it from S3
      if (existingInvoice.invoiceFile) {
        // Extract S3 key from URL
        const urlParts = existingInvoice.invoiceFile.split('.amazonaws.com/');
        if (urlParts.length === 2) {
          const s3Key = urlParts[1];
          await removeFileFromS3(s3Key);
        }
      }
      // Upload new file
      const s3Url = await uploadFileToS3({
        buffer: reqWithFile.file.buffer,
        originalname: reqWithFile.file.originalname,
        mimetype: reqWithFile.file.mimetype
      });
      value.invoiceFile = s3Url;
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
    // Delete invoice file from S3 if exists
    if (invoice.invoiceFile) {
      const urlParts = invoice.invoiceFile.split('.amazonaws.com/');
      if (urlParts.length === 2) {
        const s3Key = urlParts[1];
        await removeFileFromS3(s3Key);
      }
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
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Start date for filtering (inclusive, optional)
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: End date for filtering (inclusive, optional)
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
 *                     totalOutstanding:
 *                       type: number
 *                     unsent:
 *                       type: integer
 *                     draft:
 *                       type: integer
 *                     sent:
 *                       type: integer
 *                     partial:
 *                       type: integer
 *                     overdue:
 *                       type: integer
 *                     paid:
 *                       type: integer
 *       500:
 *         description: Internal server error
 */
export const getInvoiceStats = async (req: Request, res: Response): Promise<any> => {
  try {
    // Get date filter from request body, fallback to current month
    let { startDate, endDate } = req.body || {};
    let filterStart: Date, filterEnd: Date;
    if (startDate && endDate) {
      filterStart = new Date(startDate);
      filterEnd = new Date(endDate);
      // Set end time to end of day
      filterEnd.setHours(23, 59, 59, 999);
    } else {
      const now = new Date();
      filterStart = new Date(now.getFullYear(), now.getMonth(), 1);
      filterEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Common filter for date range and not deleted
    const dateFilter = {
      isDelete: false,
      createdAt: Between(filterStart, filterEnd)
    };

    // Status counts
    const [
      totalInvoices,
      draftInvoices,
      sentInvoices,
      partialInvoices,
      overdueInvoices,
      paidInvoices,
      unsentInvoices
    ] = await Promise.all([
      invoiceRepo.count({ where: dateFilter }),
      invoiceRepo.count({ where: { ...dateFilter, status: 'draft' } }),
      invoiceRepo.count({ where: { ...dateFilter, status: 'sent' } }),
      invoiceRepo.count({ where: { ...dateFilter, status: 'partialyPaid' } }),
      invoiceRepo.count({ where: { ...dateFilter, status: 'overdue' } }),
      invoiceRepo.count({ where: { ...dateFilter, status: 'paid' } }),
      invoiceRepo.count({ where: [
        { ...dateFilter, status: 'draft' },
        { ...dateFilter, status: 'reminder' }
      ] })
    ]);

    // Get all invoices for this date range
    const invoices = await invoiceRepo.find({ where: dateFilter });

    // Calculate totalAmount and totalOutstanding
    const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
    const totalOutstanding = invoices
      .filter(inv => ['unpaid', 'partialyPaid', 'overdue'].includes(inv.status))
      .reduce((sum, inv) => sum + inv.amount, 0);

    return res.json({
      success: true,
      data: {
        totalInvoices,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        totalOutstanding: parseFloat(totalOutstanding.toFixed(2)),
        unsent: unsentInvoices,
        draft: draftInvoices,
        sent: sentInvoices,
        partial: partialInvoices,
        overdue: overdueInvoices,
        paid: paidInvoices
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


/**
 * @swagger
 * /api/invoices/{id}/mark-bad:
 *   put:
 *     summary: Mark an invoice as bad
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
 *         description: Invoice marked as bad successfully
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
 *       404:
 *         description: Invoice not found
 *       500:
 *         description: Internal server error
 */
export const markInvoiceAsBad = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const invoice = await invoiceRepo.findOne({ where: { id: parseInt(id), isDelete: false } });
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    invoice.status = 'bad';
    invoice.markedBadOn = new Date();

    const updatedInvoice = await invoiceRepo.save(invoice);

    return res.json({
      success: true,
      data: updatedInvoice,
      message: 'Invoice marked as bad successfully'
    });
  } catch (error) {
    console.error('Error marking invoice as bad:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/invoices/vat-stats:
 *   get:
 *     summary: Get VAT statistics
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering (inclusive, optional)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering (inclusive, optional)
 *     responses:
 *       200:
 *         description: VAT statistics
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
 *                     totalVatCollected:
 *                       type: number
 *                     totalVatPaid:
 *                       type: number
 *                     netVatOwed:
 *                       type: number
 *                     invoicesFiled:
 *                       type: integer
 *                     creditNotesApplied:
 *                       type: number
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error
 */
export const getVatStats = async (req: Request, res: Response): Promise<any> => {
  try {
    // Get date filter from query params, fallback to current month
    let { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    let filterStart: Date, filterEnd: Date;
    if (startDate && endDate) {
      filterStart = new Date(startDate);
      filterEnd = new Date(endDate);
      filterEnd.setHours(23, 59, 59, 999);
    } else {
      const now = new Date();
      filterStart = new Date(now.getFullYear(), now.getMonth(), 1);
      filterEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Common filter for date range and not deleted
    const dateFilter = {
      isDelete: false,
      createdAt: Between(filterStart, filterEnd)
    };

    // Get current logged in user (assumes req.user is set by auth middleware)
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized: User not found" });
    }

    // Get all invoices for this date range and user
    const invoices = await invoiceRepo.find({ where: { ...dateFilter, userId } });

    // Get all credit notes for this date range and user
    const creditNoteRepo = AppDataSource.getRepository(require('../entity/CreditNotes').CreditNotes);
    const creditNotes = await creditNoteRepo.find({ where: { ...dateFilter, userId } });

    // Calculate total VAT collected
    const totalVatCollected = invoices.reduce((sum, inv) => sum + (Number(inv.vat) || 0), 0);
    // Total VAT paid (no expense entity, so 0 for now)
    const totalVatPaid = 0;
    // Net VAT owed
    const netVatOwed = totalVatCollected - totalVatPaid;
    // Invoices filed
    const invoicesFiled = invoices.length;
    // Credit notes applied (sum of amount field)
    const creditNotesApplied = creditNotes.reduce((sum, cn) => sum + (Number(cn.amount) || 0), 0);

    return res.json({
      success: true,
      data: {
        totalVatCollected: parseFloat(totalVatCollected.toFixed(2)),
        totalVatPaid: parseFloat(totalVatPaid.toFixed(2)),
        netVatOwed: parseFloat(netVatOwed.toFixed(2)),
        invoicesFiled,
        creditNotesApplied: parseFloat(creditNotesApplied.toFixed(2))
      },
      message: 'VAT statistics calculated successfully'
    });
  } catch (error) {
    console.error('Error fetching VAT stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
