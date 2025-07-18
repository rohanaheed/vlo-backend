import { Request, Response } from 'express';
import { AppDataSource } from '../config/db';
import { Matter } from '../entity/Matter';
import { matterSchema, updateMatterSchema } from '../utils/validators/inputValidator';

const matterRepo = AppDataSource.getRepository(Matter);

/**
 * @swagger
 * /matters:
 *   post:
 *     summary: Create a new Matter
 *     tags:
 *       - Matters
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Matter'
 *     responses:
 *       201:
 *         description: Matter created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Matter'
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request (validation error)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
export const createMatter = async (req: Request, res: Response): Promise<any> => {
  try {
    const { error, value } = matterSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }
    const matter = matterRepo.create({ ...value, isDelete: false });
    const savedMatter = await matterRepo.save(matter);
    return res.status(201).json({ success: true, data: savedMatter, message: 'Matter created successfully' });
  } catch (error) {
    console.error('Error creating matter:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * @swagger
 * /matters:
 *   get:
 *     summary: Get all Matters (paginated)
 *     tags:
 *       - Matters
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
 *         name: customerId
 *         schema:
 *           type: integer
 *         description: Filter by customer ID
 *     responses:
 *       200:
 *         description: List of matters
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
 *                     $ref: '#/components/schemas/Matter'
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
// Get all Matters (paginated)
export const getAllMatters = async (req: Request, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Build query with advanced search options
    const query = matterRepo.createQueryBuilder("matter")
      .where("matter.isDelete = :isDelete", { isDelete: false });

    // Filter by customerId
    if (req.query.customerId) {
      query.andWhere("matter.customerId = :customerId", { customerId: parseInt(req.query.customerId as string) });
    }

    // Filter by status
    if (req.query.status) {
      query.andWhere("matter.status = :status", { status: req.query.status });
    }

    // Filter by name (partial match, case-insensitive)
    if (req.query.name) {
      query.andWhere("LOWER(matter.name) LIKE :name", { name: `%${(req.query.name as string).toLowerCase()}%` });
    }

    // Filter by date range (createdAt)
    if (req.query.startDate && req.query.endDate) {
      query.andWhere("matter.createdAt BETWEEN :startDate AND :endDate", {
        startDate: new Date(req.query.startDate as string),
        endDate: new Date(req.query.endDate as string)
      });
    } else if (req.query.startDate) {
      query.andWhere("matter.createdAt >= :startDate", {
        startDate: new Date(req.query.startDate as string)
      });
    } else if (req.query.endDate) {
      query.andWhere("matter.createdAt <= :endDate", {
        endDate: new Date(req.query.endDate as string)
      });
    }

    // Pagination and ordering
    query.skip((page - 1) * limit)
         .take(limit)
         .orderBy("matter.createdAt", "DESC");

    const [matters, total] = await query.getManyAndCount();

    return res.json({
      success: true,
      data: matters,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalItems: total
    });
  } catch (error) {
    console.error('Error fetching matters:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * @swagger
 * /matters/{id}:
 *   get:
 *     summary: Get Matter by ID
 *     tags:
 *       - Matters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Matter ID
 *     responses:
 *       200:
 *         description: Matter found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Matter'
 *       404:
 *         description: Matter not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
// Get Matter by ID
export const getMatterById = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const matter = await matterRepo.findOne({ where: { id: +id, isDelete: false } });
    if (!matter) {
      return res.status(404).json({ success: false, message: 'Matter not found' });
    }
    return res.json({ success: true, data: matter });
  } catch (error) {
    console.error('Error fetching matter:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * @swagger
 * /matters/{id}:
 *   put:
 *     summary: Update Matter by ID
 *     tags:
 *       - Matters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Matter ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Matter'
 *     responses:
 *       200:
 *         description: Matter updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Matter'
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request (validation error)
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
 *         description: Matter not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
// Update Matter by ID
export const updateMatter = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { error, value } = updateMatterSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }
    const matter = await matterRepo.findOne({ where: { id: +id, isDelete: false } });
    if (!matter) {
      return res.status(404).json({ success: false, message: 'Matter not found' });
    }
    Object.assign(matter, value);
    matter.updatedAt = new Date();
    const updatedMatter = await matterRepo.save(matter);
    return res.json({ success: true, data: updatedMatter, message: 'Matter updated successfully' });
  } catch (error) {
    console.error('Error updating matter:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * @swagger
 * /matters/{id}:
 *   delete:
 *     summary: Soft delete Matter by ID
 *     tags:
 *       - Matters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Matter ID
 *     responses:
 *       200:
 *         description: Matter deleted successfully
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
 *         description: Matter not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
// Soft delete Matter by ID
export const deleteMatter = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const matter = await matterRepo.findOne({ where: { id: +id, isDelete: false } });
    if (!matter) {
      return res.status(404).json({ success: false, message: 'Matter not found' });
    }
    matter.isDelete = true;
    matter.updatedAt = new Date();
    await matterRepo.save(matter);
    return res.json({ success: true, message: 'Matter deleted successfully' });
  } catch (error) {
    console.error('Error deleting matter:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
