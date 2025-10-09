import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { CampaignChannel } from "../entity/CampaignChannel";

const channelRepo = AppDataSource.getRepository(CampaignChannel);

/**
 * @swagger
 * /api/marketing/channels:
 *   post:
 *     summary: Create a new campaign channel
 *     tags: [Marketing Channels]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - campaignId
 *               - channelType
 *             properties:
 *               campaignId:
 *                 type: number
 *               accountId:
 *                 type: string
 *               apiKey:
 *                 type: string
 *               targetingParameters:
 *                 type: object
 *               channelConfig:
 *                 type: object
 *               channelType:
 *                 type: string
 *                 enum: [Email, Twitter, TikTok, YouTube, WhatsApp, SMS, Instagram, LinkedIn, Facebook, Google Ads, Twilio]
 *               isActive:
 *                 type: boolean
 *               channelSettings:
 *                 type: object
 *     responses:
 *       201:
 *         description: Campaign channel created successfully
 */
export const createCampaignChannel = async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      campaignId,
      channelType,
      accountId,
      apiKey,
      targetingParameters,
      channelConfig,
      isActive = true,
      channelSettings
    } = req.body;

    if (!campaignId || !channelType) {
      return res.status(400).json({
        success: false,
        message: "Campaign ID and channel type are required"
      });
    }

    const channel = new CampaignChannel();
    channel.campaignId = campaignId;
    channel.channelType = channelType;
    channel.isActive = isActive;
    channel.channelSettings = channelSettings || {};
    channel.accountId = accountId || "";
    channel.apiKey = apiKey || "";
    channel.targetingParameters = targetingParameters || {};
    channel.channelConfig = channelConfig || {};
    channel.isDelete = false;
    channel.createdAt = new Date();
    channel.updatedAt = new Date();

    const savedChannel = await channelRepo.save(channel);

    return res.status(201).json({
      success: true,
      data: savedChannel,
      message: 'Campaign channel created successfully'
    });

  } catch (error) {
    console.error('Error creating campaign channel:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/channels:
 *   get:
 *     summary: Get all campaign channels (paginated)
 *     tags: [Marketing Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: campaignId
 *         schema:
 *           type: number
 *         description: Filter by campaign ID
 *       - in: query
 *         name: channelType
 *         schema:
 *           type: string
 *         description: Filter by channel type
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of campaign channels with pagination
 */
export const getAllCampaignChannels = async (req: Request, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const campaignId = req.query.campaignId ? Number(req.query.campaignId) : null;
    const channelType = (req.query.channelType as string) || "";
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : null;

    const qb = channelRepo.createQueryBuilder("channel")
      .where("channel.isDelete = :isDelete", { isDelete: false });

    if (campaignId) {
      qb.andWhere("channel.campaignId = :campaignId", { campaignId });
    }

    if (channelType) {
      qb.andWhere("channel.channelType = :channelType", { channelType });
    }

    if (isActive !== null) {
      qb.andWhere("channel.isActive = :isActive", { isActive });
    }

    const [channels, total] = await qb
      .orderBy("channel.createdAt", "DESC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return res.json({
      success: true,
      data: channels,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Error fetching campaign channels:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/channels/{id}:
 *   get:
 *     summary: Get campaign channel by ID
 *     tags: [Marketing Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Channel ID
 *     responses:
 *       200:
 *         description: Campaign channel details
 *       404:
 *         description: Campaign channel not found
 */
export const getCampaignChannelById = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const channel = await channelRepo.findOne({
      where: { 
        id: Number(id),
        isDelete: false
      }
    });

    if (!channel) {
      return res.status(404).json({
        success: false,
        message: "Campaign channel not found"
      });
    }

    return res.json({
      success: true,
      data: channel,
      message: 'Campaign channel retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting campaign channel:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/channels/{id}:
 *   put:
 *     summary: Update campaign channel
 *     tags: [Marketing Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Channel ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               channelType:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               channelSettings:
 *                 type: object
 *     responses:
 *       200:
 *         description: Campaign channel updated successfully
 *       404:
 *         description: Campaign channel not found
 */
export const updateCampaignChannel = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const channel = await channelRepo.findOne({
      where: { 
        id: Number(id),
        isDelete: false
      }
    });

    if (!channel) {
      return res.status(404).json({
        success: false,
        message: "Campaign channel not found"
      });
    }

    // Update channel fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && (channel as any).hasOwnProperty(key)) {
        (channel as any)[key] = updateData[key];
      }
    });

    channel.updatedAt = new Date();
    const savedChannel = await channelRepo.save(channel);

    return res.json({
      success: true,
      data: savedChannel,
      message: 'Campaign channel updated successfully'
    });

  } catch (error) {
    console.error('Error updating campaign channel:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/channels/{id}:
 *   delete:
 *     summary: Soft delete campaign channel
 *     tags: [Marketing Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Channel ID
 *     responses:
 *       200:
 *         description: Campaign channel deleted successfully
 *       404:
 *         description: Campaign channel not found
 */
export const deleteCampaignChannel = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const channel = await channelRepo.findOne({
      where: { 
        id: Number(id),
        isDelete: false
      }
    });

    if (!channel) {
      return res.status(404).json({
        success: false,
        message: "Campaign channel not found"
      });
    }

    channel.isDelete = true;
    channel.updatedAt = new Date();
    await channelRepo.save(channel);

    return res.json({
      success: true,
      message: 'Campaign channel deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting campaign channel:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
