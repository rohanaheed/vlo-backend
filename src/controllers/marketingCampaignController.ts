import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { MarketingCampaign } from "../entity/MarketingCampaign";
import { CampaignChannel } from "../entity/CampaignChannel";
import { CampaignMedia } from "../entity/CampaignMedia";
import { Lead } from "../entity/Lead";
import { EmailPerformance } from "../entity/EmailPerformance";
import { SocialMediaPerformance } from "../entity/SocialMediaPerformance";
import { SMSPerformance } from "../entity/SMSPerformance";
import { GoogleAdsPerformance } from "../entity/GoogleAdsPerformance";

const campaignRepo = AppDataSource.getRepository(MarketingCampaign);
const channelRepo = AppDataSource.getRepository(CampaignChannel);
const mediaRepo = AppDataSource.getRepository(CampaignMedia);
const leadRepo = AppDataSource.getRepository(Lead);
const emailPerfRepo = AppDataSource.getRepository(EmailPerformance);
const socialPerfRepo = AppDataSource.getRepository(SocialMediaPerformance);
const smsPerfRepo = AppDataSource.getRepository(SMSPerformance);
const googleAdsPerfRepo = AppDataSource.getRepository(GoogleAdsPerformance);

/**
 * @swagger
 * /api/marketing/campaigns:
 *   post:
 *     summary: Create a new marketing campaign
 *     tags: [Marketing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - campaignName
 *               - campaignType
 *             properties:
 *               campaignName:
 *                 type: string
 *               description:
 *                 type: string
 *               campaignType:
 *                 type: string
 *                 enum: [Email, SMS, Social Media, Google Ads, WhatsApp, Telegram]
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               budget:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [Draft, Active, Paused, Completed, Cancelled]
 *               audienceTargeting:
 *                 type: string
 *               content:
 *                 type: string
 *               subjectLine:
 *                 type: string
 *               scheduleConfig:
 *                 type: object
 *               campaignSettings:
 *                 type: object
 *               businessId:
 *                 type: number
 *               customerId:
 *                 type: number
 *               currencyId:
 *                 type: number
 *               packageId:
 *                 type: number
 *               subscriptionId:
 *                 type: number
 *     responses:
 *       201:
 *         description: Campaign created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
export const createCampaign = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.id;
    const {
      campaignName,
      description,
      campaignType,
      startDate,
      endDate,
      budget,
      status = "Draft",
      audienceTargeting,
      content,
      subjectLine,
      scheduleConfig,
      campaignSettings,
      businessId,
      customerId,
      currencyId,
      packageId,
      subscriptionId
    } = req.body;

    // Validate required fields
    if (!campaignName || !campaignType) {
      return res.status(400).json({
        success: false,
        message: "Campaign name and type are required"
      });
    }

    // Generate campaign ID in format "Camp-XXX"
    const lastCampaign = await campaignRepo.findOne({
      where: {},
      order: { id: "DESC" }
    });
    const nextId = lastCampaign ? lastCampaign.id + 1 : 1;
    const campaignId = `Camp-${nextId.toString().padStart(3, '0')}`;

    // Create campaign instance
    const campaign = new MarketingCampaign();
    campaign.userId = userId;
    campaign.businessId = businessId || 0;
    campaign.customerId = customerId || 0;
    campaign.campaignName = campaignName;
    campaign.description = description || "";
    campaign.campaignType = campaignType;
    campaign.startDate = startDate ? new Date(startDate) : new Date();
    campaign.endDate = endDate ? new Date(endDate) : new Date();
    campaign.budget = budget || 0;
    campaign.status = status;
    campaign.audienceTargeting = audienceTargeting || "";
    campaign.content = content || "";
    campaign.subjectLine = subjectLine || "";
    campaign.scheduleConfig = scheduleConfig || {};
    campaign.campaignSettings = campaignSettings || {};
    campaign.currencyId = currencyId || 0;
    campaign.packageId = packageId || 0;
    campaign.subscriptionId = subscriptionId || 0;
    campaign.orderId = 0;
    campaign.transactionId = 0;
    campaign.isDelete = false;
    campaign.createdAt = new Date();
    campaign.updatedAt = new Date();

    const savedCampaign = await campaignRepo.save(campaign);

    return res.status(201).json({
      success: true,
      data: {
        ...savedCampaign,
        campaignId: campaignId
      },
      message: 'Campaign created successfully'
    });

  } catch (error) {
    console.error('Error creating campaign:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/campaigns:
 *   get:
 *     summary: Get all marketing campaigns (paginated)
 *     tags: [Marketing]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search campaigns by name
 *       - in: query
 *         name: campaignType
 *         schema:
 *           type: string
 *         description: Filter by campaign type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by campaign status
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *         description: Filter by platform
 *       - in: query
 *         name: channel
 *         schema:
 *           type: string
 *         description: Filter by channel
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter campaigns starting after this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter campaigns ending before this date
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of campaigns with pagination
 */
export const getAllCampaigns = async (req: Request, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const search = (req.query.search as string) || "";
    const campaignType = (req.query.campaignType as string) || "";
    const status = (req.query.status as string) || "";
    const platform = (req.query.platform as string) || "";
    const channel = (req.query.channel as string) || "";
    const startDate = (req.query.startDate as string) || "";
    const endDate = (req.query.endDate as string) || "";
    let orderParam = (req.query.order as string)?.toLowerCase() || "desc";
    let order: "ASC" | "DESC" = orderParam === "asc" ? "ASC" : "DESC";

    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Build query with filters
    const qb = campaignRepo.createQueryBuilder("campaign")
      .where("campaign.isDelete = :isDelete", { isDelete: false });

    // User-based filtering (non-super_admin can only see their campaigns)
    if (userRole !== "super_admin") {
      qb.andWhere("campaign.userId = :userId", { userId });
    }

    // Search filter
    if (search.trim()) {
      qb.andWhere("campaign.campaignName LIKE :search", { search: `%${search}%` });
    }

    // Type filter
    if (campaignType) {
      qb.andWhere("campaign.campaignType = :campaignType", { campaignType });
    }

    // Status filter
    if (status) {
      qb.andWhere("campaign.status = :status", { status });
    }

    // Date filters
    if (startDate) {
      qb.andWhere("campaign.startDate >= :startDate", { startDate: new Date(startDate) });
    }
    if (endDate) {
      qb.andWhere("campaign.endDate <= :endDate", { endDate: new Date(endDate) });
    }

    // Get campaigns with pagination
    const [campaigns, total] = await qb
      .orderBy("campaign.createdAt", order)
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // Get channels for each campaign
    const campaignIds = campaigns.map(c => c.id);
    let channels: any[] = [];
    if (campaignIds.length > 0) {
      channels = await channelRepo
        .createQueryBuilder("channel")
        .where("channel.campaignId IN (:...campaignIds)", { campaignIds })
        .andWhere("channel.isDelete = :isDelete", { isDelete: false })
        .getMany();
    }

    // Group channels by campaign ID
    const channelMap = new Map();
    channels.forEach((channel: any) => {
      if (!channelMap.has(channel.campaignId)) {
        channelMap.set(channel.campaignId, []);
      }
      channelMap.get(channel.campaignId).push(channel);
    });

    // Enhance campaigns with channel data and formatted ID
    const enhancedCampaigns = campaigns.map((campaign, index) => {
      const campaignChannels = channelMap.get(campaign.id) || [];
      const campaignId = `Camp-${campaign.id.toString().padStart(3, '0')}`;
      
      // Determine platform and channel from campaign type and channels
      let platform = campaign.campaignType;
      let channel = campaign.campaignType;
      
      if (campaignChannels.length > 0) {
        platform = campaignChannels[0].channelType;
        channel = campaignChannels[0].channelType;
      }

      return {
        id: campaign.id,
        campaignId: campaignId,
        campaignName: campaign.campaignName,
        platform: platform,
        objective: campaign.audienceTargeting || "Brand Awareness", // Default objective
        channel: channel,
        startDate: campaign.startDate.toISOString().split('T')[0],
        endDate: campaign.endDate.toISOString().split('T')[0],
        scheduledTime: campaign.startDate.toISOString().split('T')[0],
        conversion: 0, // Will be populated from performance data
        sent: 0, // Will be populated from performance data
        engagement: 0, // Will be populated from performance data
        reach: 0, // Will be populated from performance data
        spend: `£ ${campaign.budget.toFixed(2)}`,
        status: campaign.status,
        channels: campaignChannels,
        description: campaign.description,
        campaignType: campaign.campaignType,
        budget: campaign.budget,
        audienceTargeting: campaign.audienceTargeting,
        content: campaign.content,
        subjectLine: campaign.subjectLine,
        scheduleConfig: campaign.scheduleConfig,
        campaignSettings: campaign.campaignSettings,
        userId: campaign.userId,
        businessId: campaign.businessId,
        customerId: campaign.customerId,
        currencyId: campaign.currencyId,
        packageId: campaign.packageId,
        subscriptionId: campaign.subscriptionId,
        orderId: campaign.orderId,
        transactionId: campaign.transactionId,
        isDelete: campaign.isDelete,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt
      };
    });

    return res.json({
      success: true,
      data: enhancedCampaigns,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/campaigns/{id}:
 *   get:
 *     summary: Get campaign by ID
 *     tags: [Marketing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Campaign ID
 *     responses:
 *       200:
 *         description: Campaign details
 *       404:
 *         description: Campaign not found
 */
export const getCampaignById = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    const qb = campaignRepo.createQueryBuilder("campaign")
      .where("campaign.id = :id", { id: Number(id) })
      .andWhere("campaign.isDelete = :isDelete", { isDelete: false });

    if (userRole !== "super_admin") {
      qb.andWhere("campaign.userId = :userId", { userId });
    }

    const campaign = await qb.getOne();

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found"
      });
    }

    // Get channels for this campaign
    const channels = await channelRepo
      .createQueryBuilder("channel")
      .where("channel.campaignId = :campaignId", { campaignId: campaign.id })
      .andWhere("channel.isDelete = :isDelete", { isDelete: false })
      .getMany();

    // Get media for this campaign
    const media = await mediaRepo
      .createQueryBuilder("media")
      .where("media.campaignId = :campaignId", { campaignId: campaign.id })
      .andWhere("media.isDelete = :isDelete", { isDelete: false })
      .getMany();

    const campaignId = `Camp-${campaign.id.toString().padStart(3, '0')}`;

    return res.json({
      success: true,
      data: {
        ...campaign,
        campaignId: campaignId,
        channels: channels,
        media: media
      },
      message: 'Campaign retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting campaign:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/campaigns/{id}:
 *   put:
 *     summary: Update campaign
 *     tags: [Marketing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Campaign ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               campaignName:
 *                 type: string
 *               description:
 *                 type: string
 *               campaignType:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               budget:
 *                 type: number
 *               status:
 *                 type: string
 *               audienceTargeting:
 *                 type: string
 *               content:
 *                 type: string
 *               subjectLine:
 *                 type: string
 *               scheduleConfig:
 *                 type: object
 *               campaignSettings:
 *                 type: object
 *     responses:
 *       200:
 *         description: Campaign updated successfully
 *       404:
 *         description: Campaign not found
 */
export const updateCampaign = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const updateData = req.body;

    const qb = campaignRepo.createQueryBuilder("campaign")
      .where("campaign.id = :id", { id: Number(id) })
      .andWhere("campaign.isDelete = :isDelete", { isDelete: false });

    if (userRole !== "super_admin") {
      qb.andWhere("campaign.userId = :userId", { userId });
    }

    const campaign = await qb.getOne();

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found"
      });
    }

    // Update campaign fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && (campaign as any).hasOwnProperty(key)) {
        if (key === 'startDate' || key === 'endDate') {
          (campaign as any)[key] = new Date(updateData[key]);
        } else {
          (campaign as any)[key] = updateData[key];
        }
      }
    });

    campaign.updatedAt = new Date();
    const savedCampaign = await campaignRepo.save(campaign);

    return res.json({
      success: true,
      data: savedCampaign,
      message: 'Campaign updated successfully'
    });

  } catch (error) {
    console.error('Error updating campaign:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/campaigns/{id}:
 *   delete:
 *     summary: Soft delete campaign
 *     tags: [Marketing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Campaign ID
 *     responses:
 *       200:
 *         description: Campaign deleted successfully
 *       404:
 *         description: Campaign not found
 */
export const deleteCampaign = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    const qb = campaignRepo.createQueryBuilder("campaign")
      .where("campaign.id = :id", { id: Number(id) })
      .andWhere("campaign.isDelete = :isDelete", { isDelete: false });

    if (userRole !== "super_admin") {
      qb.andWhere("campaign.userId = :userId", { userId });
    }

    const campaign = await qb.getOne();

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found"
      });
    }

    campaign.isDelete = true;
    campaign.updatedAt = new Date();
    await campaignRepo.save(campaign);

    return res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting campaign:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/campaigns/stats:
 *   get:
 *     summary: Get marketing campaign statistics
 *     tags: [Marketing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter stats from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter stats to this date
 *       - in: query
 *         name: campaignType
 *         schema:
 *           type: string
 *         description: Filter by campaign type
 *     responses:
 *       200:
 *         description: Campaign statistics
 */
export const getCampaignStats = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const { startDate, endDate, campaignType } = req.query;

    const qb = campaignRepo.createQueryBuilder("campaign")
      .where("campaign.isDelete = :isDelete", { isDelete: false });

    if (userRole !== "super_admin") {
      qb.andWhere("campaign.userId = :userId", { userId });
    }

    if (startDate) {
      qb.andWhere("campaign.startDate >= :startDate", { startDate: new Date(startDate as string) });
    }

    if (endDate) {
      qb.andWhere("campaign.endDate <= :endDate", { endDate: new Date(endDate as string) });
    }

    if (campaignType) {
      qb.andWhere("campaign.campaignType = :campaignType", { campaignType });
    }

    // Get total campaigns
    const totalCampaigns = await qb.getCount();

    // Get campaigns by status
    const statusStats = await qb
      .select("campaign.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("campaign.status")
      .getRawMany();

    // Get campaigns by type
    const typeStats = await qb
      .select("campaign.campaignType", "type")
      .addSelect("COUNT(*)", "count")
      .groupBy("campaign.campaignType")
      .getRawMany();

    // Get total budget
    const budgetStats = await qb
      .select("SUM(campaign.budget)", "totalBudget")
      .getRawOne();

    return res.json({
      success: true,
      data: {
        totalCampaigns,
        statusStats: statusStats.map(stat => ({
          status: stat.status,
          count: Number(stat.count)
        })),
        typeStats: typeStats.map(stat => ({
          type: stat.type,
          count: Number(stat.count)
        })),
        totalBudget: Number(budgetStats.totalBudget) || 0
      },
      message: 'Campaign statistics retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting campaign stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/campaigns/{id}/performance:
 *   get:
 *     summary: Get campaign performance data
 *     tags: [Marketing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Campaign ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter performance from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter performance to this date
 *     responses:
 *       200:
 *         description: Campaign performance data
 */
export const getCampaignPerformance = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Verify campaign exists and user has access
    const qb = campaignRepo.createQueryBuilder("campaign")
      .where("campaign.id = :id", { id: Number(id) })
      .andWhere("campaign.isDelete = :isDelete", { isDelete: false });

    if (userRole !== "super_admin") {
      qb.andWhere("campaign.userId = :userId", { userId });
    }

    const campaign = await qb.getOne();

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found"
      });
    }

    // Get performance data based on campaign type
    let performanceData = {};

    switch (campaign.campaignType) {
      case "Email":
        const emailPerf = await emailPerfRepo
          .createQueryBuilder("perf")
          .where("perf.campaignId = :campaignId", { campaignId: campaign.id })
          .getMany();
        performanceData = { emailPerformance: emailPerf };
        break;

      case "SMS":
        const smsPerf = await smsPerfRepo
          .createQueryBuilder("perf")
          .where("perf.campaignId = :campaignId", { campaignId: campaign.id })
          .getMany();
        performanceData = { smsPerformance: smsPerf };
        break;

      case "Social Media":
        const socialPerf = await socialPerfRepo
          .createQueryBuilder("perf")
          .where("perf.campaignId = :campaignId", { campaignId: campaign.id })
          .getMany();
        performanceData = { socialMediaPerformance: socialPerf };
        break;

      case "Google Ads":
        const googleAdsPerf = await googleAdsPerfRepo
          .createQueryBuilder("perf")
          .where("perf.campaignId = :campaignId", { campaignId: campaign.id })
          .getMany();
        performanceData = { googleAdsPerformance: googleAdsPerf };
        break;

      default:
        performanceData = { message: "No performance data available for this campaign type" };
    }

    return res.json({
      success: true,
      data: {
        campaign: campaign,
        performance: performanceData
      },
      message: 'Campaign performance data retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting campaign performance:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
