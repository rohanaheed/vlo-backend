import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { HeadsUp } from "../entity/HeadsUp";

const headsUpRepo = AppDataSource.getRepository(HeadsUp);

/**
 * @swagger
 * /api/heads-up:
 *   get:
 *     summary: Get all heads-up notifications
 *     tags: [HeadsUp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by status
 *       - in: query
 *         name: module
 *         schema:
 *           type: string
 *         description: Filter by module
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by end date
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc, dsc]
 *         description: Sort order (asc or desc)
 *     responses:
 *       200:
 *         description: List of heads-up notifications
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
 *                     $ref: '#/components/schemas/HeadsUp'
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
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const getAllHeadsUp =async (req: Request, res: Response): Promise<any> => {
  const { page = 1, limit = 10, status, module } = req.query;
  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(limit as string) || 10;
  const skip = (pageNum - 1) * limitNum;
  // Add support for order (asc or desc) on createdAt column
  let orderParam = (req.query.order as string)?.toLowerCase() || "desc";
  let order: "ASC" | "DESC" = orderParam === "asc" ? "ASC" : "DESC";

  // Add filter on date range if provided
  const { startDate, endDate } = req.query;
  let startDateObj: Date | undefined;
  let endDateObj: Date | undefined;

  if (startDate && typeof startDate === "string") {
    startDateObj = new Date(startDate);
    if (isNaN(startDateObj.getTime())) startDateObj = undefined;
  }
  if (endDate && typeof endDate === "string") {
    endDateObj = new Date(endDate);
    if (isNaN(endDateObj.getTime())) endDateObj = undefined;
  }

  const queryBuilder = headsUpRepo
    .createQueryBuilder("headsUp")
    .where("headsUp.isDelete = :isDelete", { isDelete: false });

  if (status) {
    queryBuilder.andWhere("headsUp.status = :status", { status });
  }

  if (module) {
    queryBuilder.andWhere("headsUp.module = :module", { module });
  }

  if (startDateObj && endDateObj) {
    queryBuilder.andWhere("headsUp.createdAt BETWEEN :startDate AND :endDate", { startDate: startDateObj, endDate: endDateObj });
  }

  const [headsUp, total] = await queryBuilder
    .orderBy("headsUp.createdAt", order)
    .skip(skip)
    .take(limitNum)
    .getManyAndCount();

  const totalPages = Math.ceil(total / limitNum);

  res.status(200).json({
    success: true,
    data: headsUp,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
    },
  });
};

/**
 * @swagger
 * /api/heads-up/{id}:
 *   get:
 *     summary: Get a heads-up notification by ID
 *     tags: [HeadsUp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Heads-up notification ID
 *     responses:
 *       200:
 *         description: Heads-up notification details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/HeadsUp'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const getHeadsUpById = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  const headsUp = await headsUpRepo.findOne({
    where: { id: parseInt(id), isDelete: false },
  });

  if (!headsUp) {
    return res.status(404).json({
      success: false,
      message: "Heads-up notification not found",
    });
  }

  res.status(200).json({
    success: true,
    data: headsUp,
  });
};

/**
 * @swagger
 * /api/heads-up:
 *   post:
 *     summary: Create a new heads-up notification
 *     tags: [HeadsUp]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HeadsUpInput'
 *     responses:
 *       201:
 *         description: Heads-up notification created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/HeadsUp'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const createHeadsUp =async (req: Request, res: Response): Promise<any> => {
    const headsUpData = req.body;

    const headsUp = headsUpRepo.create(headsUpData);
    const savedHeadsUp = await headsUpRepo.save(headsUp);

    res.status(201).json({
      success: true,
      message: "Heads-up notification created successfully",
      data: savedHeadsUp,
    });
};

/**
 * @swagger
 * /api/heads-up/{id}:
 *   put:
 *     summary: Update a heads-up notification
 *     tags: [HeadsUp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Heads-up notification ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HeadsUpUpdateInput'
 *     responses:
 *       200:
 *         description: Heads-up notification updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/HeadsUp'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const updateHeadsUp =async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;
    const updateData = req.body;

    const headsUp = await headsUpRepo.findOne({
      where: { id: parseInt(id), isDelete: false },
    });

    if (!headsUp) {
      return res.status(404).json({
        success: false,
        message: "Heads-up notification not found",
      });
    }

    // Defensive: If updateData is a string (e.g. due to malformed JSON), try to parse it
    let safeUpdateData = updateData;
    if (typeof updateData === "string") {
      try {
        safeUpdateData = JSON.parse(updateData);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "Invalid JSON in request body. Please ensure property names are double-quoted and the body is valid JSON.",
        });
      }
    }

    // Only update fields that are present in safeUpdateData, leave others unchanged
    for (const key of Object.keys(safeUpdateData)) {
      if (safeUpdateData[key] !== undefined && key in headsUp) {
        (headsUp as any)[key] = safeUpdateData[key];
      }
    }

    const updatedHeadsUp = await headsUpRepo.save(headsUp);

    res.status(200).json({
      success: true,
      message: "Heads-up notification updated successfully",
      data: updatedHeadsUp,
    });
  };


/**
 * @swagger
 * /api/heads-up/{id}:
 *   delete:
 *     summary: Delete a heads-up notification (soft delete)
 *     tags: [HeadsUp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Heads-up notification ID
 *     responses:
 *       200:
 *         description: Heads-up notification deleted successfully
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
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const deleteHeadsUp = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  const headsUp = await headsUpRepo.findOne({
    where: { id: parseInt(id), isDelete: false },
  });

  if (!headsUp) {
    return res.status(404).json({
      success: false,
      message: "Heads-up notification not found",
    });
  }

  headsUp.isDelete = true;
  await headsUpRepo.save(headsUp);

  res.status(200).json({
    success: true,
    message: "Heads-up notification deleted successfully",
  });
};

/**
 * @swagger
 * /api/heads-up/{id}/toggle-status:
 *   patch:
 *     summary: Toggle heads-up notification status
 *     tags: [HeadsUp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Heads-up notification ID
 *     responses:
 *       200:
 *         description: Heads-up notification status toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/HeadsUp'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const toggleHeadsUpStatus = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  const headsUp = await headsUpRepo.findOne({
    where: { id: parseInt(id), isDelete: false },
  });

  if (!headsUp) {
    return res.status(404).json({
      success: false,
      message: "Heads-up notification not found",
    });
  }

  headsUp.status = headsUp.status === "active" ? "inactive" : "active";
  const updatedHeadsUp = await headsUpRepo.save(headsUp);

  res.status(200).json({
    success: true,
    message: `Heads-up notification ${updatedHeadsUp.status === "active" ? "enabled" : "disabled"} successfully`,
    data: updatedHeadsUp,
  });
};

/**
 * @swagger
 * /api/heads-up/{id}/enable:
 *   patch:
 *     summary: Enable a heads-up notification
 *     tags: [HeadsUp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Heads-up notification ID
 *     responses:
 *       200:
 *         description: Heads-up notification enabled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/HeadsUp'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const enableHeadsUp = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  const headsUp = await headsUpRepo.findOne({
    where: { id: parseInt(id), isDelete: false },
  });

  if (!headsUp) {
    return res.status(404).json({
      success: false,
      message: "Heads-up notification not found",
    });
  }

  headsUp.status = "active";
  headsUp.enabled = true;
  const updatedHeadsUp = await headsUpRepo.save(headsUp);

  res.status(200).json({
    success: true,
    message: "Heads-up notification enabled successfully",
    data: updatedHeadsUp,
  });
};

/**
 * @swagger
 * /api/heads-up/{id}/disable:
 *   patch:
 *     summary: Disable a heads-up notification
 *     tags: [HeadsUp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Heads-up notification ID
 *     responses:
 *       200:
 *         description: Heads-up notification disabled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/HeadsUp'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const disableHeadsUp = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

    const headsUp = await headsUpRepo.findOne({
    where: { id: parseInt(id), isDelete: false },
  });

  if (!headsUp) {
    return res.status(404).json({
      success: false,
      message: "Heads-up notification not found",
    });
  }

  headsUp.status = "inactive";
  headsUp.enabled = false;
  const updatedHeadsUp = await headsUpRepo.save(headsUp);

  res.status(200).json({
    success: true,
    message: "Heads-up notification disabled successfully",
    data: updatedHeadsUp,
  });
};
