import { Request, Response } from "express";
import { Subscription } from "../entity/Subscription";
import { AppDataSource } from '../config/db';

const subscriptionRepo = AppDataSource.getRepository(Subscription);

/**
 * @swagger
 * components:
 *   schemas:
 *     Subscription:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         packageId:
 *           type: integer
 *         customerId:
 *           type: integer
 *         isDelete:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/subscriptions:
 *   post:
 *     summary: Create a new subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - packageId
 *               - customerId
 *             properties:
 *               packageId:
 *                 type: integer
 *               customerId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Subscription created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subscription'
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Internal server error
 */
export const createSubscription = async (req: Request, res: Response): Promise<any> => {
  try {
    const { customerPackageId, customerId } = req.body;
    if (!customerPackageId || !customerId) {
      return res.status(400).json({
        success: false,
        message: " customerPackageId and customerId are required"
      });
    }
    const subscription = subscriptionRepo.create({
      customerPackageId,
      customerId,
      isDelete: false
    });
    const saved = await subscriptionRepo.save(subscription);
    return res.status(201).json({
      success: true,
      data: saved,
      message: "Subscription created successfully"
    });
  } catch (error) {
    console.error("Error creating subscription:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * @swagger
 * /api/subscriptions:
 *   get:
 *     summary: Get all subscriptions
 *     tags: [Subscriptions]
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
 *     responses:
 *       200:
 *         description: List of subscriptions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Subscription'
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
export const getAllSubscriptions = async (req: Request, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    // Add support for order (asc or desc) on createdAt column
    let orderParam = (req.query.order as string)?.toLowerCase() || "desc";
    let order: "ASC" | "DESC" = orderParam === "asc" ? "ASC" : "DESC";


    const [subscriptions, total] = await subscriptionRepo.findAndCount({
      where: { isDelete: false },
      skip: skip,
      take: limit,
      order: { createdAt: order }
    });

    return res.json({
      success: true,
      data: subscriptions,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalItems: total
    });
  } catch (error) {
    console.error("Error getting subscriptions:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * @swagger
 * /api/subscriptions/{id}:
 *   get:
 *     summary: Get subscription by ID
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Subscription ID
 *     responses:
 *       200:
 *         description: Subscription details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subscription'
 *       404:
 *         description: Subscription not found
 *       500:
 *         description: Internal server error
 */
export const getSubscriptionById = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const subscription = await subscriptionRepo.findOne({
      where: { id: +id, isDelete: false }
    });
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found"
      });
    }
    return res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error("Error getting subscription by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * @swagger
 * /api/subscriptions/{id}:
 *   put:
 *     summary: Update subscription by ID
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Subscription ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               packageId:
 *                 type: integer
 *               customerId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Subscription updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subscription'
 *       404:
 *         description: Subscription not found
 *       500:
 *         description: Internal server error
 */
export const updateSubscription = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { customerPackageId, customerId } = req.body;
    const subscription = await subscriptionRepo.findOne({
      where: { id: +id, isDelete: false }
    });
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found"
      });
    }
    if (customerPackageId !== undefined) subscription.customerPackageId = customerPackageId;
    if (customerId !== undefined) subscription.customerId = customerId;
    subscription.updatedAt = new Date();
    const updated = await subscriptionRepo.save(subscription);
    return res.json({
      success: true,
      data: updated,
      message: "Subscription updated successfully"
    });
  } catch (error) {
    console.error("Error updating subscription:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * @swagger
 * /api/subscriptions/{id}:
 *   delete:
 *     summary: Delete subscription by ID (soft delete)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Subscription ID
 *     responses:
 *       200:
 *         description: Subscription deleted successfully
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
 *         description: Subscription not found
 *       500:
 *         description: Internal server error
 */
export const deleteSubscription = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const subscription = await subscriptionRepo.findOne({
      where: { id: +id, isDelete: false }
    });
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found"
      });
    }
    subscription.isDelete = true;
    subscription.updatedAt = new Date();
    await subscriptionRepo.save(subscription);
    return res.json({
      success: true,
      message: "Subscription deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting subscription:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};


/**
 * @swagger
 * /api/subscriptions/{id}/auto-renew:
 *   patch:
 *     tags: [Subscriptions]
 *     summary: Enable or disable auto-renew for a subscription
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Subscription ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [autoRenew]
 *             properties:
 *               autoRenew:
 *                 type: boolean
 *                 description: Enable or disable auto-renew
 *     responses:
 *       200:
 *         description: Auto-renew status updated successfully
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
 *                   $ref: '#/components/schemas/Subscription'
 *       404:
 *         description: Subscription not found
 *       500:
 *         description: Internal server error
 */
export const updateAutoRenew = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { autoRenew } = req.body;

    // Validate input
    if (typeof autoRenew !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: "autoRenew must be a boolean value"
      });
    }

    const subscription = await subscriptionRepo.findOne({
      where: { id: +id, isDelete: false }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found"
      });
    }

    subscription.autoRenew = autoRenew;
    subscription.updatedAt = new Date();
    
    const updatedSubscription = await subscriptionRepo.save(subscription);

    return res.json({
      success: true,
      message: `Auto-renew ${autoRenew ? 'enabled' : 'disabled'} successfully`,
      data: updatedSubscription
    });
  } catch (error) {
    console.error("Error updating auto-renew status:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

