import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { TimeBill } from "../entity/TimeBill";
import { In } from "typeorm";

const timeBillRepository = AppDataSource.getRepository(TimeBill);

/**
 * @swagger
 * /api/time-bills:
 *   post:
 *     summary: Create a new time bill
 *     tags: [TimeBills]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TimeBillInput'
 *     responses:
 *       201:
 *         description: TimeBill created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TimeBill'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
export const createTimeBill = async (req: Request, res: Response) => {
  try {
    // Create and save the new TimeBill
    const timeBill = timeBillRepository.create(req.body);
    const result = await timeBillRepository.save(timeBill);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to create TimeBill", error });
  }
};

/**
 * @swagger
 * /api/time-bills:
 *   get:
 *     summary: Get all time bills (paginated, with search and filter)
 *     tags: [TimeBills]
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
 *         description: Filter by caseWorker or matter (partial match)
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
 *         description: Filter by createdAt >= this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by createdAt <= this date
 *     responses:
 *       200:
 *         description: List of time bills
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TimeBill'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       500:
 *         description: Internal server error
 */
export const getAllTimeBills = async (req: Request, res: Response) => {
  try {
    // Pagination
    const page = parseInt(req.query.page as string) > 0 ? parseInt(req.query.page as string) : 1;
    const limit = parseInt(req.query.limit as string) > 0 ? parseInt(req.query.limit as string) : 10;
    const skip = (page - 1) * limit;

    // Filters
    const status = req.query.status as string | undefined;
    const name = req.query.name as string | undefined; // search on caseWorker or matter
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    // Build query
    const query = timeBillRepository.createQueryBuilder("timeBill")
      .where("timeBill.isDelete = :isDelete", { isDelete: false });

    if (status) {
      query.andWhere("timeBill.status LIKE :status", { status: `%${status}%` });
    }

    if (name) {
      query.andWhere(
        "(timeBill.caseWorker LIKE :name OR timeBill.matter LIKE :name)",
        { name: `%${name}%` }
      );
    }

    if (startDate && endDate) {
      query.andWhere("timeBill.createdAt BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      });
    } else if (startDate) {
      query.andWhere("timeBill.createdAt >= :startDate", { startDate });
    } else if (endDate) {
      query.andWhere("timeBill.createdAt <= :endDate", { endDate });
    }

    // Get total count for pagination
    const [timeBills, total] = await query
      .orderBy("timeBill.createdAt", "DESC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    res.status(200).json({
      data: timeBills,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch TimeBills", error });
  }
};

/**
 * @swagger
 * /api/time-bills/{id}:
 *   get:
 *     summary: Get time bill by ID
 *     tags: [TimeBills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: TimeBill ID
 *     responses:
 *       200:
 *         description: TimeBill details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TimeBill'
 *       404:
 *         description: TimeBill not found
 *       500:
 *         description: Internal server error
 */
export const getTimeBillById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const timeBill = await timeBillRepository.findOne({ where: { id: Number(id), isDelete: false } });
    if (!timeBill) {
      return res.status(404).json({ message: "TimeBill not found" });
    }
    res.status(200).json(timeBill);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch TimeBill", error });
  }
};

/**
 * @swagger
 * /api/time-bills/{id}:
 *   put:
 *     summary: Update time bill by ID
 *     tags: [TimeBills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: TimeBill ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TimeBillInput'
 *     responses:
 *       200:
 *         description: TimeBill updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TimeBill'
 *       400:
 *         description: Validation error
 *       404:
 *         description: TimeBill not found
 *       500:
 *         description: Internal server error
 */
export const updateTimeBill = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let timeBill = await timeBillRepository.findOne({ where: { id: Number(id), isDelete: false } });
    if (!timeBill) {
      return res.status(404).json({ message: "TimeBill not found" });
    }
    timeBillRepository.merge(timeBill, req.body);
    const result = await timeBillRepository.save(timeBill);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to update TimeBill", error });
  }
};

/**
 * @swagger
 * /api/time-bills/{id}:
 *   delete:
 *     summary: Delete time bill by ID
 *     tags: [TimeBills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: TimeBill ID
 *     responses:
 *       200:
 *         description: TimeBill deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: TimeBill not found
 *       500:
 *         description: Internal server error
 */
export const deleteTimeBill = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let timeBill = await timeBillRepository.findOne({ where: { id: Number(id), isDelete: false } });
    if (!timeBill) {
      return res.status(404).json({ message: "TimeBill not found" });
    }
    timeBill.isDelete = true;
    await timeBillRepository.save(timeBill);
    res.status(200).json({ message: "TimeBill deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete TimeBill", error });
  }
};

/**
 * @swagger
 * /api/time-bills/bulk-delete:
 *   post:
 *     summary: Bulk delete time bills by IDs
 *     tags: [TimeBills]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of TimeBill IDs to delete
 *     responses:
 *       200:
 *         description: TimeBills deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 deletedCount:
 *                   type: integer
 *                 notFoundIds:
 *                   type: array
 *                   items:
 *                     type: integer
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Internal server error
 */
export const bulkDeleteTimeBills = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No IDs provided" });
    }
    // Find all matching, not already deleted
    const timeBills = await timeBillRepository.find({ where: { id: In(ids), isDelete: false } });
    const foundIds = timeBills.map(tb => tb.id);
    const notFoundIds = ids.filter((id: number) => !foundIds.includes(id));
    // Soft delete found
    for (const tb of timeBills) {
      tb.isDelete = true;
    }
    await timeBillRepository.save(timeBills);
    return res.status(200).json({
      success: true,
      deletedCount: timeBills.length,
      notFoundIds,
      message: `Deleted ${timeBills.length} time bills. ${notFoundIds.length ? `Not found: ${notFoundIds.join(", ")}` : ''}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to bulk delete TimeBills", error });
  }
};

/**
 * @swagger
 * /api/time-bills/calendar-summary:
 *   get:
 *     summary: Get calendar summary of time bills (grouped by day, with totals)
 *     tags: [TimeBills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: "Filter by dateOfWork >= this date (default: first day of current month)"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: "Filter by dateOfWork <= this date (default: last day of current month)"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status (optional)
 *     responses:
 *       200:
 *         description: Calendar summary of time bills
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 days:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                       totalAmount:
 *                         type: number
 *                       totalHours:
 *                         type: number
 *                 totalMonthlyHours:
 *                   type: number
 *                 totalMonthlyBill:
 *                   type: number
 *       500:
 *         description: Internal server error
 */
export const getTimeBillCalendarSummary = async (req: Request, res: Response) => {
  try {
    // Parse date range
    let { startDate, endDate, status } = req.query;
    let filterStart: Date, filterEnd: Date;
    if (startDate && endDate) {
      filterStart = new Date(startDate as string);
      filterEnd = new Date(endDate as string);
      filterEnd.setHours(23, 59, 59, 999);
    } else {
      const now = new Date();
      filterStart = new Date(now.getFullYear(), now.getMonth(), 1);
      filterEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Build query
    const qb = timeBillRepository.createQueryBuilder("timeBill")
      .where("timeBill.isDelete = :isDelete", { isDelete: false })
      .andWhere("timeBill.dateOfWork >= :startDate AND timeBill.dateOfWork <= :endDate", {
        startDate: filterStart,
        endDate: filterEnd
      });
    if (status) {
      qb.andWhere("timeBill.status LIKE :status", { status: `%${status}%` });
    }
    const timeBills = await qb.getMany();

    // Group by day
    const dayMap: Record<string, { totalAmount: number; totalHours: number }> = {};
    let totalMonthlyHours = 0;
    let totalMonthlyBill = 0;
    for (const tb of timeBills) {
      // Parse duration and hourlyRate
      let hours = 0;
      let rate = 0;
      // Try to parse duration as float (hours)
      if (tb.duration) {
        // Support "1.5" or "01:30" format
        if (/^\d{1,2}:\d{2}$/.test(tb.duration)) {
          const [h, m] = tb.duration.split(":").map(Number);
          hours = h + m / 60;
        } else {
          hours = parseFloat(tb.duration);
        }
      }
      if (tb.hourlyRate) {
        rate = parseFloat(tb.hourlyRate);
      }
      const amount = hours * rate;
      const day = tb.dateOfWork ? new Date(tb.dateOfWork).toISOString().slice(0, 10) : (tb.createdAt ? new Date(tb.createdAt).toISOString().slice(0, 10) : "");
      if (!dayMap[day]) {
        dayMap[day] = { totalAmount: 0, totalHours: 0 };
      }
      dayMap[day].totalAmount += amount;
      dayMap[day].totalHours += hours;
      totalMonthlyHours += hours;
      totalMonthlyBill += amount;
    }
    // Convert to array sorted by date
    const days = Object.entries(dayMap)
      .map(([date, { totalAmount, totalHours }]) => ({ date, totalAmount, totalHours }))
      .sort((a, b) => a.date.localeCompare(b.date));
    res.status(200).json({ days, totalMonthlyHours, totalMonthlyBill });
  } catch (error) {
    res.status(500).json({ message: "Failed to get calendar summary", error });
  }
};
