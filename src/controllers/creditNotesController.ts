import { Request, Response } from 'express';
import { AppDataSource } from '../config/db';
import { CreditNotes } from '../entity/CreditNotes';
import { Customer } from '../entity/Customer';
import { Currency } from '../entity/Currency';
import { Invoice } from '../entity/Invioce';
import { creditNoteSchema, updateCreditNoteSchema } from '../utils/validators/inputValidator';
import { Between } from 'typeorm';

const creditNoteRepo = AppDataSource.getRepository(CreditNotes);
const customerRepo = AppDataSource.getRepository(Customer);
const currencyRepo = AppDataSource.getRepository(Currency);
const invoiceRepo = AppDataSource.getRepository(Invoice);

/**
 * @swagger
 * /api/credit-notes:
 *   post:
 *     summary: Create a new credit note
 *     tags: [Credit Notes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - creditNoteNumber
 *               - amount
 *               - customerId
 *               - invoiceId
 *               - currencyId
 *             properties:
 *               creditNoteNumber:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *               amount:
 *                 type: number
 *                 minimum: 0
 *               customerId:
 *                 type: integer
 *                 minimum: 1
 *               invoiceId:
 *                 type: integer
 *                 minimum: 1
 *               currencyId:
 *                 type: integer
 *                 minimum: 1
 *               status:
 *                 type: string
 *                 enum: [draft, sent, paid, overdue, cancelled, partialyPaid, disputed, reminder, resend, void, viewed, unpaid]
 *                 default: draft
 *     responses:
 *       201:
 *         description: Credit note created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CreditNote'
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       404:
 *         description: Customer, Currency, or Invoice not found
 *       500:
 *         description: Internal server error
 */
export const createCreditNote = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.id;

    // Validate request body
    const { error, value } = creditNoteSchema.validate(req.body);

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

    // Check if invoice exists
    const invoice = await invoiceRepo.findOne({ where: { id: value.invoiceId, isDelete: false } });
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Check if credit note number already exists
    const existingCreditNote = await creditNoteRepo.findOne({ 
      where: { creditNoteNumber: value.creditNoteNumber, isDelete: false } 
    });
    if (existingCreditNote) {
      return res.status(400).json({
        success: false,
        message: 'Credit note number already exists'
      });
    }

    // Create credit note instance
    const creditNote = new CreditNotes();
    creditNote.creditNoteNumber = value.creditNoteNumber;
    creditNote.amount = value.amount;
    creditNote.customerId = value.customerId;
    creditNote.invoiceId = value.invoiceId;
    creditNote.currencyId = value.currencyId;
    creditNote.status = value.status;
    creditNote.isDelete = false;

    const savedCreditNote = await creditNoteRepo.save(creditNote);

    return res.status(201).json({
      success: true,
      data: savedCreditNote,
      message: 'Credit note created successfully'
    });

  } catch (error) {
    console.error('Error creating credit note:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/credit-notes:
 *   get:
 *     summary: Get all credit notes (paginated)
 *     tags: [Credit Notes]
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
 *         description: Filter by credit note status
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: integer
 *         description: Filter by customer ID
 *       - in: query
 *         name: invoiceId
 *         schema:
 *           type: integer
 *         description: Filter by invoice ID
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
 *         description: Credit notes retrieved successfully
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
 *                     $ref: '#/components/schemas/CreditNote'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       500:
 *         description: Internal server error
 */
export const getAllCreditNotes = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : undefined;
    const invoiceId = req.query.invoiceId ? parseInt(req.query.invoiceId as string) : undefined;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const skip = (page - 1) * limit;

    // Build where conditions
    const whereConditions: any = { isDelete: false };

    if (status) {
      whereConditions.status = status;
    }

    if (customerId) {
      whereConditions.customerId = customerId;
    }

    if (invoiceId) {
      whereConditions.invoiceId = invoiceId;
    }

    if (startDate && endDate) {
      whereConditions.createdAt = Between(new Date(startDate), new Date(endDate));
    }

    // Get credit notes with relations
    const [creditNotes, total] = await creditNoteRepo.findAndCount({
      where: whereConditions,
      relations: ['customer', 'currency', 'invoice'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' }
    });

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      data: creditNotes,
      pagination: {
        page,
        limit,
        total,
        totalPages
      },
      message: 'Credit notes retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting credit notes:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/credit-notes/{id}:
 *   get:
 *     summary: Get credit note by ID
 *     tags: [Credit Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Credit note ID
 *     responses:
 *       200:
 *         description: Credit note retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CreditNote'
 *                 message:
 *                   type: string
 *       404:
 *         description: Credit note not found
 *       500:
 *         description: Internal server error
 */
export const getCreditNoteById = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.id;
    const creditNoteId = parseInt(req.params.id);

    if (!creditNoteId || isNaN(creditNoteId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credit note ID'
      });
    }

    const creditNote = await creditNoteRepo.findOne({
      where: { id: creditNoteId, isDelete: false },
      relations: ['customer', 'currency', 'invoice']
    });

    if (!creditNote) {
      return res.status(404).json({
        success: false,
        message: 'Credit note not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: creditNote,
      message: 'Credit note retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting credit note:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/credit-notes/{id}:
 *   put:
 *     summary: Update credit note by ID
 *     tags: [Credit Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Credit note ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               creditNoteNumber:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *               amount:
 *                 type: number
 *                 minimum: 0
 *               customerId:
 *                 type: integer
 *                 minimum: 1
 *               invoiceId:
 *                 type: integer
 *                 minimum: 1
 *               currencyId:
 *                 type: integer
 *                 minimum: 1
 *               status:
 *                 type: string
 *                 enum: [draft, sent, paid, overdue, cancelled, partialyPaid, disputed, reminder, resend, void, viewed, unpaid]
 *     responses:
 *       200:
 *         description: Credit note updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CreditNote'
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       404:
 *         description: Credit note, Customer, Currency, or Invoice not found
 *       500:
 *         description: Internal server error
 */
export const updateCreditNote = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.id;
    const creditNoteId = parseInt(req.params.id);

    if (!creditNoteId || isNaN(creditNoteId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credit note ID'
      });
    }

    // Validate request body
    const { error, value } = updateCreditNoteSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // Check if credit note exists
    const existingCreditNote = await creditNoteRepo.findOne({
      where: { id: creditNoteId, isDelete: false }
    });

    if (!existingCreditNote) {
      return res.status(404).json({
        success: false,
        message: 'Credit note not found'
      });
    }

    // Check if customer exists (if provided)
    if (value.customerId) {
      const customer = await customerRepo.findOne({ where: { id: value.customerId, isDelete: false } });
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }
    }

    // Check if currency exists (if provided)
    if (value.currencyId) {
      const currency = await currencyRepo.findOne({ where: { id: value.currencyId } });
      if (!currency) {
        return res.status(404).json({
          success: false,
          message: 'Currency not found'
        });
      }
    }

    // Check if invoice exists (if provided)
    if (value.invoiceId) {
      const invoice = await invoiceRepo.findOne({ where: { id: value.invoiceId, isDelete: false } });
      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'Invoice not found'
        });
      }
    }

    // Check if credit note number already exists (if provided and different)
    if (value.creditNoteNumber && value.creditNoteNumber !== existingCreditNote.creditNoteNumber) {
      const duplicateCreditNote = await creditNoteRepo.findOne({ 
        where: { creditNoteNumber: value.creditNoteNumber, isDelete: false } 
      });
      if (duplicateCreditNote) {
        return res.status(400).json({
          success: false,
          message: 'Credit note number already exists'
        });
      }
    }

    // Update credit note
    Object.assign(existingCreditNote, value);
    const updatedCreditNote = await creditNoteRepo.save(existingCreditNote);

    return res.status(200).json({
      success: true,
      data: updatedCreditNote,
      message: 'Credit note updated successfully'
    });

  } catch (error) {
    console.error('Error updating credit note:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/credit-notes/{id}:
 *   delete:
 *     summary: Delete credit note by ID (soft delete)
 *     tags: [Credit Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Credit note ID
 *     responses:
 *       200:
 *         description: Credit note deleted successfully
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
 *         description: Credit note not found
 *       500:
 *         description: Internal server error
 */
export const deleteCreditNote = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.id;
    const creditNoteId = parseInt(req.params.id);

    if (!creditNoteId || isNaN(creditNoteId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credit note ID'
      });
    }

    const creditNote = await creditNoteRepo.findOne({
      where: { id: creditNoteId, isDelete: false }
    });

    if (!creditNote) {
      return res.status(404).json({
        success: false,
        message: 'Credit note not found'
      });
    }

    // Soft delete
    creditNote.isDelete = true;
    await creditNoteRepo.save(creditNote);

    return res.status(200).json({
      success: true,
      message: 'Credit note deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting credit note:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/credit-notes/stats:
 *   get:
 *     summary: Get credit notes statistics
 *     tags: [Credit Notes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Credit notes statistics retrieved successfully
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
 *                     totalCreditNotes:
 *                       type: integer
 *                     totalAmount:
 *                       type: number
 *                     statusCounts:
 *                       type: object
 *                     monthlyStats:
 *                       type: array
 *       500:
 *         description: Internal server error
 */
export const getCreditNoteStats = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.id;

    // Get total credit notes
    const totalCreditNotes = await creditNoteRepo.count({
      where: { isDelete: false }
    });

    // Get total amount
    const totalAmountResult = await creditNoteRepo
      .createQueryBuilder('creditNote')
      .select('SUM(creditNote.amount)', 'totalAmount')
      .where('creditNote.isDelete = :isDelete', { isDelete: false })
      .getRawOne();

    const totalAmount = parseFloat(totalAmountResult?.totalAmount || '0');

    // Get status counts
    const statusCounts = await creditNoteRepo
      .createQueryBuilder('creditNote')
      .select('creditNote.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('creditNote.isDelete = :isDelete', { isDelete: false })
      .groupBy('creditNote.status')
      .getRawMany();

    const statusCountsMap = statusCounts.reduce((acc: any, item) => {
      acc[item.status] = parseInt(item.count);
      return acc;
    }, {});

    // Get monthly stats for the last 12 months
    const monthlyStats = await creditNoteRepo
      .createQueryBuilder('creditNote')
      .select('DATE_FORMAT(creditNote.createdAt, "%Y-%m")', 'month')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(creditNote.amount)', 'totalAmount')
      .where('creditNote.isDelete = :isDelete', { isDelete: false })
      .andWhere('creditNote.createdAt >= :startDate', {
        startDate: new Date(new Date().getFullYear() - 1, 0, 1)
      })
      .groupBy('month')
      .orderBy('month', 'ASC')
      .getRawMany();

    return res.status(200).json({
      success: true,
      data: {
        totalCreditNotes,
        totalAmount,
        statusCounts: statusCountsMap,
        monthlyStats
      },
      message: 'Credit notes statistics retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting credit note stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/credit-notes/customer/{customerId}:
 *   get:
 *     summary: Get credit notes by customer ID
 *     tags: [Credit Notes]
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
 *         description: Customer credit notes retrieved successfully
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
 *                     $ref: '#/components/schemas/CreditNote'
 *                 pagination:
 *                   type: object
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Internal server error
 */
export const getCreditNotesByCustomer = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.id;
    const customerId = parseInt(req.params.customerId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!customerId || isNaN(customerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID'
      });
    }

    // Check if customer exists
    const customer = await customerRepo.findOne({ where: { id: customerId, isDelete: false } });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const skip = (page - 1) * limit;

    // Get credit notes for the customer
    const [creditNotes, total] = await creditNoteRepo.findAndCount({
      where: { customerId, isDelete: false },
      relations: ['currency', 'invoice'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' }
    });

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      data: creditNotes,
      pagination: {
        page,
        limit,
        total,
        totalPages
      },
      message: 'Customer credit notes retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting customer credit notes:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
