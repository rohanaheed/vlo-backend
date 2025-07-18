import { Request, Response } from 'express';
import { AppDataSource } from '../config/db';
import { Installment } from '../entity/Installment';
import { installmentSchema, updateInstallmentSchema } from '../utils/validators/inputValidator';

const installmentRepo = AppDataSource.getRepository(Installment);

/**
 * @swagger
 * /api/installments:
 *   post:
 *     summary: Create a new installment
 *     tags: [Installments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InstallmentInput'
 *     responses:
 *       201:
 *         description: Installment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Installment'
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
// Create Installment
export const createInstallment = async (req: Request, res: Response): Promise<any> => {
  try {
    const { error, value } = installmentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }
    const installment = installmentRepo.create(value);
    const savedInstallment = await installmentRepo.save(installment);
    return res.status(201).json({ success: true, data: savedInstallment, message: 'Installment created successfully' });
  } catch (error) {
    console.error('Error creating installment:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/installments:
 *   get:
 *     summary: Get all installments (paginated, with search and filter)
 *     tags: [Installments]
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
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter by installment name (case-insensitive, partial match)
 *       - in: query
 *         name: invoiceId
 *         schema:
 *           type: integer
 *         description: Filter by invoice ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by createdAt greater than or equal to this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by createdAt less than or equal to this date
 *     responses:
 *       200:
 *         description: List of installments
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
 *                     $ref: '#/components/schemas/Installment'
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalItems:
 *                   type: integer
 *       500:
 *         description: Internal server error
 */
// Get all Installments (paginated)
export const getAllInstallments = async (req: Request, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Search filters
    const { name, invoiceId, status, startDate, endDate } = req.query;

    // Build where clause dynamically
    const where: any = {};

    // Name search (assuming Installment has a 'name' field)
    if (name) {
      // Case-insensitive search
      where.name = (typeof name === 'string')
        ? () => `LOWER(installment.name) LIKE LOWER('%${name}%')`
        : undefined;
    }

    // InvoiceId filter
    if (invoiceId) {
      where.invoiceId = Number(invoiceId);
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Date range filter (assuming Installment has a 'createdAt' field)
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt['$gte'] = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt['$lte'] = new Date(endDate as string);
      }
    }

    // Use QueryBuilder for more flexible searching
    const qb = installmentRepo.createQueryBuilder('installment');

    // Name search
    if (name) {
      qb.andWhere('LOWER(installment.name) LIKE :name', { name: `%${(name as string).toLowerCase()}%` });
    }

    // InvoiceId filter
    if (invoiceId) {
      qb.andWhere('installment.invoiceId = :invoiceId', { invoiceId: Number(invoiceId) });
    }

    // Status filter
    if (status) {
      qb.andWhere('installment.status = :status', { status });
    }

    // Date range filter
    if (startDate) {
      qb.andWhere('installment.createdAt >= :startDate', { startDate: new Date(startDate as string) });
    }
    if (endDate) {
      qb.andWhere('installment.createdAt <= :endDate', { endDate: new Date(endDate as string) });
    }

    qb.orderBy('installment.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [installments, total] = await qb.getManyAndCount();

    return res.json({
      success: true,
      data: installments,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalItems: total
    });
  } catch (error) {
    console.error('Error fetching installments:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/installments/{id}:
 *   get:
 *     summary: Get installment by ID
 *     tags: [Installments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Installment ID
 *     responses:
 *       200:
 *         description: Installment details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Installment'
 *       404:
 *         description: Installment not found
 *       500:
 *         description: Internal server error
 */
// Get Installment by ID
export const getInstallmentById = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const installment = await installmentRepo.findOne({ where: { id: +id } });
    if (!installment) {
      return res.status(404).json({ success: false, message: 'Installment not found' });
    }
    return res.json({ success: true, data: installment });
  } catch (error) {
    console.error('Error fetching installment:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/installments/{id}:
 *   put:
 *     summary: Update installment by ID
 *     tags: [Installments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Installment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InstallmentUpdateInput'
 *     responses:
 *       200:
 *         description: Installment updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Installment'
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       404:
 *         description: Installment not found
 *       500:
 *         description: Internal server error
 */
// Update Installment by ID
export const updateInstallment = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { error, value } = updateInstallmentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }
    const installment = await installmentRepo.findOne({ where: { id: +id } });
    if (!installment) {
      return res.status(404).json({ success: false, message: 'Installment not found' });
    }
    Object.assign(installment, value);
    const updatedInstallment = await installmentRepo.save(installment);
    return res.json({ success: true, data: updatedInstallment, message: 'Installment updated successfully' });
  } catch (error) {
    console.error('Error updating installment:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/installments/{id}:
 *   delete:
 *     summary: Delete installment by ID
 *     tags: [Installments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Installment ID
 *     responses:
 *       200:
 *         description: Installment deleted successfully
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
 *         description: Installment not found
 *       500:
 *         description: Internal server error
 */
// Delete Installment by ID
export const deleteInstallment = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const installment = await installmentRepo.findOne({ where: { id: +id } });
    if (!installment) {
      return res.status(404).json({ success: false, message: 'Installment not found' });
    }
    await installmentRepo.remove(installment);
    return res.json({ success: true, message: 'Installment deleted successfully' });
  } catch (error) {
    console.error('Error deleting installment:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
