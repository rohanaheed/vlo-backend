import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { EmailPerformance } from "../entity/EmailPerformance";
import { SocialMediaPerformance } from "../entity/SocialMediaPerformance";
import { SMSPerformance } from "../entity/SMSPerformance";
import { GoogleAdsPerformance } from "../entity/GoogleAdsPerformance";

const emailPerfRepo = AppDataSource.getRepository(EmailPerformance);
const socialPerfRepo = AppDataSource.getRepository(SocialMediaPerformance);
const smsPerfRepo = AppDataSource.getRepository(SMSPerformance);
const googleAdsPerfRepo = AppDataSource.getRepository(GoogleAdsPerformance);

/**
 * @swagger
 * /api/marketing/performance/email:
 *   post:
 *     summary: Create email performance record
 *     tags: [Marketing Performance]
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
 *               - date
 *             properties:
 *               campaignId:
 *                 type: number
 *               campaignChannelId:
 *                 type: number
 *               userId:
 *                 type: number
 *               customerId:
 *                 type: number
 *               currencyId:
 *                 type: number
 *               date:
 *                 type: string
 *                 format: date
 *               campaignName:
 *                 type: string
 *               emailsSent:
 *                 type: number
 *               totalOpened:
 *                 type: number
 *               totalClicked:
 *                 type: number
 *               totalBounced:
 *                 type: number
 *               totalUnsubscribed:
 *                 type: number
 *               openRate:
 *                 type: number
 *               clickRate:
 *                 type: number
 *               bounceRate:
 *                 type: number
 *               unsubscribeRate:
 *                 type: number
 *               uniqueOpens:
 *                 type: number
 *               uniqueClicks:
 *                 type: number
 *               uniqueOpenRate:
 *                 type: number
 *               uniqueClickRate:
 *                 type: number
 *               spamComplaints:
 *                 type: number
 *               spamComplaintRate:
 *                 type: number
 *               revenue:
 *                 type: number
 *               conversions:
 *                 type: number
 *               conversionRate:
 *                 type: number
 *               deviceBreakdown:
 *                 type: object
 *               locationBreakdown:
 *                 type: object
 *               timeBreakdown:
 *                 type: object
 *     responses:
 *       201:
 *         description: Email performance record created successfully
 */
export const createEmailPerformance = async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      campaignId,
      campaignChannelId,
      userId,
      customerId,
      currencyId,
      date,
      campaignName,
      emailsSent,
      totalOpened,
      totalClicked,
      totalBounced,
      totalUnsubscribed,
      openRate,
      clickRate,
      bounceRate,
      unsubscribeRate,
      uniqueOpens,
      uniqueClicks,
      uniqueOpenRate,
      uniqueClickRate,
      spamComplaints,
      spamComplaintRate,
      revenue,
      conversions,
      conversionRate,
      deviceBreakdown,
      locationBreakdown,
      timeBreakdown
    } = req.body;

    if (!campaignId || !date) {
      return res.status(400).json({
        success: false,
        message: "Campaign ID and date are required"
      });
    }

    const performance = new EmailPerformance();
    performance.campaignId = campaignId;
    performance.campaignChannelId = campaignChannelId || 0;
    performance.userId = userId || 0;
    performance.customerId = customerId || 0;
    performance.currencyId = currencyId || 0;
    performance.date = new Date(date);
    performance.campaignName = campaignName || "";
    performance.emailsSent = emailsSent || 0;
    performance.totalOpened = totalOpened || 0;
    performance.totalClicked = totalClicked || 0;
    performance.totalBounced = totalBounced || 0;
    performance.totalUnsubscribed = totalUnsubscribed || 0;
    performance.openRate = openRate || 0;
    performance.clickRate = clickRate || 0;
    performance.bounceRate = bounceRate || 0;
    performance.unsubscribeRate = unsubscribeRate || 0;
    performance.uniqueOpens = uniqueOpens || 0;
    performance.uniqueClicks = uniqueClicks || 0;
    performance.uniqueOpenRate = uniqueOpenRate || 0;
    performance.uniqueClickRate = uniqueClickRate || 0;
    performance.spamComplaints = spamComplaints || 0;
    performance.spamComplaintRate = spamComplaintRate || 0;
    performance.revenue = revenue || 0;
    performance.conversions = conversions || 0;
    performance.conversionRate = conversionRate || 0;
    performance.deviceBreakdown = deviceBreakdown || {};
    performance.locationBreakdown = locationBreakdown || {};
    performance.timeBreakdown = timeBreakdown || {};
    performance.isDelete = false;
    performance.createdAt = new Date();
    performance.updatedAt = new Date();

    const savedPerformance = await emailPerfRepo.save(performance);

    return res.status(201).json({
      success: true,
      data: savedPerformance,
      message: 'Email performance record created successfully'
    });

  } catch (error) {
    console.error('Error creating email performance:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/performance/email:
 *   get:
 *     summary: Get email performance data
 *     tags: [Marketing Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: campaignId
 *         schema:
 *           type: number
 *         description: Filter by campaign ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date
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
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Email performance data
 */
export const getEmailPerformance = async (req: Request, res: Response): Promise<any> => {
  try {
    const { campaignId, startDate, endDate } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    const qb = emailPerfRepo.createQueryBuilder("perf")
      .where("perf.isDelete = :isDelete", { isDelete: false });

    if (userRole !== "super_admin") {
      qb.andWhere("perf.userId = :userId", { userId });
    }

    if (campaignId) {
      qb.andWhere("perf.campaignId = :campaignId", { campaignId: Number(campaignId) });
    }

    if (startDate) {
      qb.andWhere("perf.date >= :startDate", { startDate: new Date(startDate as string) });
    }

    if (endDate) {
      qb.andWhere("perf.date <= :endDate", { endDate: new Date(endDate as string) });
    }

    const [performance, total] = await qb
      .orderBy("perf.date", "DESC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return res.json({
      success: true,
      data: performance,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Error getting email performance:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/performance/social:
 *   post:
 *     summary: Create social media performance record
 *     tags: [Marketing Performance]
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
 *               - date
 *             properties:
 *               campaignId:
 *                 type: number
 *               campaignChannelId:
 *                 type: number
 *               userId:
 *                 type: number
 *               customerId:
 *                 type: number
 *               currencyId:
 *                 type: number
 *               channelType:
 *                 type: string
 *                 enum: [Twitter, TikTok, YouTube, Instagram, LinkedIn, Facebook, Telegram]
 *               postId:
 *                 type: string
 *               postContent:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               impressions:
 *                 type: number
 *               reach:
 *                 type: number
 *               engagements:
 *                 type: number
 *               likes:
 *                 type: number
 *               comments:
 *                 type: number
 *               shares:
 *                 type: number
 *               retweets:
 *                 type: number
 *               saves:
 *                 type: number
 *               views:
 *                 type: number
 *               watchTimeMinutes:
 *                 type: number
 *               followersGained:
 *                 type: number
 *               subscribersGained:
 *                 type: number
 *               connectionsGained:
 *                 type: number
 *               pageLikes:
 *                 type: number
 *               forwards:
 *                 type: number
 *               clicks:
 *                 type: number
 *               profileViews:
 *                 type: number
 *               websiteClicks:
 *                 type: number
 *               engagementRate:
 *                 type: number
 *               clickThroughRate:
 *                 type: number
 *               reachRate:
 *                 type: number
 *               impressionRate:
 *                 type: number
 *               revenue:
 *                 type: number
 *               conversions:
 *                 type: number
 *               conversionRate:
 *                 type: number
 *               demographicBreakdown:
 *                 type: object
 *               deviceBreakdown:
 *                 type: object
 *               locationBreakdown:
 *                 type: object
 *               timeBreakdown:
 *                 type: object
 *               hashtagPerformance:
 *                 type: object
 *               mentionPerformance:
 *                 type: object
 *     responses:
 *       201:
 *         description: Social media performance record created successfully
 */
export const createSocialMediaPerformance = async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      campaignId,
      campaignChannelId,
      userId,
      customerId,
      currencyId,
      channelType,
      postId,
      postContent,
      date,
      impressions,
      reach,
      engagements,
      likes,
      comments,
      shares,
      retweets,
      saves,
      views,
      watchTimeMinutes,
      followersGained,
      subscribersGained,
      connectionsGained,
      pageLikes,
      forwards,
      clicks,
      profileViews,
      websiteClicks,
      engagementRate,
      clickThroughRate,
      reachRate,
      impressionRate,
      revenue,
      conversions,
      conversionRate,
      demographicBreakdown,
      deviceBreakdown,
      locationBreakdown,
      timeBreakdown,
      hashtagPerformance,
      mentionPerformance
    } = req.body;

    if (!campaignId || !channelType || !date) {
      return res.status(400).json({
        success: false,
        message: "Campaign ID, channel type, and date are required"
      });
    }

    const performance = new SocialMediaPerformance();
    performance.campaignId = campaignId;
    performance.campaignChannelId = campaignChannelId || 0;
    performance.userId = userId || 0;
    performance.customerId = customerId || 0;
    performance.currencyId = currencyId || 0;
    performance.channelType = channelType;
    performance.postId = postId || "";
    performance.postContent = postContent || "";
    performance.date = new Date(date);
    performance.impressions = impressions || 0;
    performance.reach = reach || 0;
    performance.engagements = engagements || 0;
    performance.likes = likes || 0;
    performance.comments = comments || 0;
    performance.shares = shares || 0;
    performance.retweets = retweets || 0;
    performance.saves = saves || 0;
    performance.views = views || 0;
    performance.watchTimeMinutes = watchTimeMinutes || 0;
    performance.followersGained = followersGained || 0;
    performance.subscribersGained = subscribersGained || 0;
    performance.connectionsGained = connectionsGained || 0;
    performance.pageLikes = pageLikes || 0;
    performance.forwards = forwards || 0;
    performance.clicks = clicks || 0;
    performance.profileViews = profileViews || 0;
    performance.websiteClicks = websiteClicks || 0;
    performance.engagementRate = engagementRate || 0;
    performance.clickThroughRate = clickThroughRate || 0;
    performance.reachRate = reachRate || 0;
    performance.impressionRate = impressionRate || 0;
    performance.revenue = revenue || 0;
    performance.conversions = conversions || 0;
    performance.conversionRate = conversionRate || 0;
    performance.demographicBreakdown = demographicBreakdown || {};
    performance.deviceBreakdown = deviceBreakdown || {};
    performance.locationBreakdown = locationBreakdown || {};
    performance.timeBreakdown = timeBreakdown || {};
    performance.hashtagPerformance = hashtagPerformance || {};
    performance.mentionPerformance = mentionPerformance || {};
    performance.isDelete = false;
    performance.createdAt = new Date();
    performance.updatedAt = new Date();

    const savedPerformance = await socialPerfRepo.save(performance);

    return res.status(201).json({
      success: true,
      data: savedPerformance,
      message: 'Social media performance record created successfully'
    });

  } catch (error) {
    console.error('Error creating social media performance:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/performance/social:
 *   get:
 *     summary: Get social media performance data
 *     tags: [Marketing Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date
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
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Social media performance data
 */
export const getSocialMediaPerformance = async (req: Request, res: Response): Promise<any> => {
  try {
    const { campaignId, channelType, startDate, endDate } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    const qb = socialPerfRepo.createQueryBuilder("perf")
      .where("perf.isDelete = :isDelete", { isDelete: false });

    if (userRole !== "super_admin") {
      qb.andWhere("perf.userId = :userId", { userId });
    }

    if (campaignId) {
      qb.andWhere("perf.campaignId = :campaignId", { campaignId: Number(campaignId) });
    }

    if (channelType) {
      qb.andWhere("perf.channelType = :channelType", { channelType });
    }

    if (startDate) {
      qb.andWhere("perf.date >= :startDate", { startDate: new Date(startDate as string) });
    }

    if (endDate) {
      qb.andWhere("perf.date <= :endDate", { endDate: new Date(endDate as string) });
    }

    const [performance, total] = await qb
      .orderBy("perf.date", "DESC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return res.json({
      success: true,
      data: performance,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Error getting social media performance:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/performance/sms:
 *   post:
 *     summary: Create SMS performance record
 *     tags: [Marketing Performance]
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
 *               - date
 *             properties:
 *               campaignId:
 *                 type: number
 *               campaignChannelId:
 *                 type: number
 *               userId:
 *                 type: number
 *               customerId:
 *                 type: number
 *               currencyId:
 *                 type: number
 *               date:
 *                 type: string
 *                 format: date
 *               campaignName:
 *                 type: string
 *               smsSent:
 *                 type: number
 *               delivered:
 *                 type: number
 *               failed:
 *                 type: number
 *               replies:
 *                 type: number
 *               optOuts:
 *                 type: number
 *               clicks:
 *                 type: number
 *               conversions:
 *                 type: number
 *               deliveryRate:
 *                 type: number
 *               failureRate:
 *                 type: number
 *               replyRate:
 *                 type: number
 *               optOutRate:
 *                 type: number
 *               clickThroughRate:
 *                 type: number
 *               conversionRate:
 *                 type: number
 *               cost:
 *                 type: number
 *               revenue:
 *                 type: number
 *               costPerSMS:
 *                 type: number
 *               costPerDelivery:
 *                 type: number
 *               costPerReply:
 *                 type: number
 *               costPerConversion:
 *                 type: number
 *               revenuePerSMS:
 *                 type: number
 *               roi:
 *                 type: number
 *               carrierBreakdown:
 *                 type: object
 *               countryBreakdown:
 *                 type: object
 *               regionBreakdown:
 *                 type: object
 *               timeBreakdown:
 *                 type: object
 *               messageType:
 *                 type: string
 *               messageLength:
 *                 type: number
 *               keywordPerformance:
 *                 type: object
 *               linkPerformance:
 *                 type: object
 *               invalidNumber:
 *                 type: number
 *               blockedNumber:
 *                 type: number
 *               spamFiltered:
 *                 type: number
 *               errorBreakdown:
 *                 type: object
 *     responses:
 *       201:
 *         description: SMS performance record created successfully
 */
export const createSMSPerformance = async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      campaignId,
      campaignChannelId,
      userId,
      customerId,
      currencyId,
      date,
      campaignName,
      smsSent,
      delivered,
      failed,
      replies,
      optOuts,
      clicks,
      conversions,
      deliveryRate,
      failureRate,
      replyRate,
      optOutRate,
      clickThroughRate,
      conversionRate,
      cost,
      revenue,
      costPerSMS,
      costPerDelivery,
      costPerReply,
      costPerConversion,
      revenuePerSMS,
      roi,
      carrierBreakdown,
      countryBreakdown,
      regionBreakdown,
      timeBreakdown,
      messageType,
      messageLength,
      keywordPerformance,
      linkPerformance,
      invalidNumber,
      blockedNumber,
      spamFiltered,
      errorBreakdown
    } = req.body;

    if (!campaignId || !date) {
      return res.status(400).json({
        success: false,
        message: "Campaign ID and date are required"
      });
    }

    const performance = new SMSPerformance();
    performance.campaignId = campaignId;
    performance.campaignChannelId = campaignChannelId || 0;
    performance.userId = userId || 0;
    performance.customerId = customerId || 0;
    performance.currencyId = currencyId || 0;
    performance.date = new Date(date);
    performance.campaignName = campaignName || "";
    performance.smsSent = smsSent || 0;
    performance.delivered = delivered || 0;
    performance.failed = failed || 0;
    performance.replies = replies || 0;
    performance.optOuts = optOuts || 0;
    performance.clicks = clicks || 0;
    performance.conversions = conversions || 0;
    performance.deliveryRate = deliveryRate || 0;
    performance.failureRate = failureRate || 0;
    performance.replyRate = replyRate || 0;
    performance.optOutRate = optOutRate || 0;
    performance.clickThroughRate = clickThroughRate || 0;
    performance.conversionRate = conversionRate || 0;
    performance.cost = cost || 0;
    performance.revenue = revenue || 0;
    performance.costPerSMS = costPerSMS || 0;
    performance.costPerDelivery = costPerDelivery || 0;
    performance.costPerReply = costPerReply || 0;
    performance.costPerConversion = costPerConversion || 0;
    performance.revenuePerSMS = revenuePerSMS || 0;
    performance.roi = roi || 0;
    performance.carrierBreakdown = carrierBreakdown || {};
    performance.countryBreakdown = countryBreakdown || {};
    performance.regionBreakdown = regionBreakdown || {};
    performance.timeBreakdown = timeBreakdown || {};
    performance.messageType = messageType || "";
    performance.messageLength = messageLength || 0;
    performance.keywordPerformance = keywordPerformance || {};
    performance.linkPerformance = linkPerformance || {};
    performance.invalidNumber = invalidNumber || 0;
    performance.blockedNumber = blockedNumber || 0;
    performance.spamFiltered = spamFiltered || 0;
    performance.errorBreakdown = errorBreakdown || {};
    performance.isDelete = false;
    performance.createdAt = new Date();
    performance.updatedAt = new Date();

    const savedPerformance = await smsPerfRepo.save(performance);

    return res.status(201).json({
      success: true,
      data: savedPerformance,
      message: 'SMS performance record created successfully'
    });

  } catch (error) {
    console.error('Error creating SMS performance:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/performance/sms:
 *   get:
 *     summary: Get SMS performance data
 *     tags: [Marketing Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: campaignId
 *         schema:
 *           type: number
 *         description: Filter by campaign ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date
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
 *         description: Items per page
 *     responses:
 *       200:
 *         description: SMS performance data
 */
export const getSMSPerformance = async (req: Request, res: Response): Promise<any> => {
  try {
    const { campaignId, startDate, endDate } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    const qb = smsPerfRepo.createQueryBuilder("perf")
      .where("perf.isDelete = :isDelete", { isDelete: false });

    if (userRole !== "super_admin") {
      qb.andWhere("perf.userId = :userId", { userId });
    }

    if (campaignId) {
      qb.andWhere("perf.campaignId = :campaignId", { campaignId: Number(campaignId) });
    }

    if (startDate) {
      qb.andWhere("perf.date >= :startDate", { startDate: new Date(startDate as string) });
    }

    if (endDate) {
      qb.andWhere("perf.date <= :endDate", { endDate: new Date(endDate as string) });
    }

    const [performance, total] = await qb
      .orderBy("perf.date", "DESC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return res.json({
      success: true,
      data: performance,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Error getting SMS performance:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/performance/google-ads:
 *   post:
 *     summary: Create Google Ads performance record
 *     tags: [Marketing Performance]
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
 *               - date
 *             properties:
 *               campaignId:
 *                 type: number
 *               campaignChannelId:
 *                 type: number
 *               userId:
 *                 type: number
 *               customerId:
 *                 type: number
 *               currencyId:
 *                 type: number
 *               date:
 *                 type: string
 *                 format: date
 *               campaignName:
 *                 type: string
 *               adGroupName:
 *                 type: string
 *               adId:
 *                 type: string
 *               keyword:
 *                 type: string
 *               impressions:
 *                 type: number
 *               clicks:
 *                 type: number
 *               conversions:
 *                 type: number
 *               cost:
 *                 type: number
 *               revenue:
 *                 type: number
 *               ctr:
 *                 type: number
 *               cpc:
 *                 type: number
 *               cpm:
 *                 type: number
 *               cpa:
 *                 type: number
 *               conversionRate:
 *                 type: number
 *               roas:
 *                 type: number
 *               roi:
 *                 type: number
 *               qualityScore:
 *                 type: number
 *               avgCpc:
 *                 type: number
 *               avgPosition:
 *                 type: number
 *               searchImpressions:
 *                 type: number
 *               searchClicks:
 *                 type: number
 *               searchCtr:
 *                 type: number
 *               searchCost:
 *                 type: number
 *               displayImpressions:
 *                 type: number
 *               displayClicks:
 *                 type: number
 *               displayCtr:
 *                 type: number
 *               displayCost:
 *                 type: number
 *               videoViews:
 *                 type: number
 *               videoClicks:
 *                 type: number
 *               videoViewRate:
 *                 type: number
 *               videoCost:
 *                 type: number
 *               shoppingImpressions:
 *                 type: number
 *               shoppingClicks:
 *                 type: number
 *               shoppingCtr:
 *                 type: number
 *               shoppingCost:
 *                 type: number
 *               ageGroupBreakdown:
 *                 type: object
 *               genderBreakdown:
 *                 type: object
 *               locationBreakdown:
 *                 type: object
 *               deviceBreakdown:
 *                 type: object
 *               timeBreakdown:
 *                 type: object
 *               interestBreakdown:
 *                 type: object
 *               remarketingBreakdown:
 *                 type: object
 *               campaignType:
 *                 type: string
 *               biddingStrategy:
 *                 type: string
 *               networkType:
 *                 type: string
 *               budget:
 *                 type: number
 *               dailyBudget:
 *                 type: number
 *     responses:
 *       201:
 *         description: Google Ads performance record created successfully
 */
export const createGoogleAdsPerformance = async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      campaignId,
      campaignChannelId,
      userId,
      customerId,
      currencyId,
      date,
      campaignName,
      adGroupName,
      adId,
      keyword,
      impressions,
      clicks,
      conversions,
      cost,
      revenue,
      ctr,
      cpc,
      cpm,
      cpa,
      conversionRate,
      roas,
      roi,
      qualityScore,
      avgCpc,
      avgPosition,
      searchImpressions,
      searchClicks,
      searchCtr,
      searchCost,
      displayImpressions,
      displayClicks,
      displayCtr,
      displayCost,
      videoViews,
      videoClicks,
      videoViewRate,
      videoCost,
      shoppingImpressions,
      shoppingClicks,
      shoppingCtr,
      shoppingCost,
      ageGroupBreakdown,
      genderBreakdown,
      locationBreakdown,
      deviceBreakdown,
      timeBreakdown,
      interestBreakdown,
      remarketingBreakdown,
      campaignType,
      biddingStrategy,
      networkType,
      budget,
      dailyBudget
    } = req.body;

    if (!campaignId || !date) {
      return res.status(400).json({
        success: false,
        message: "Campaign ID and date are required"
      });
    }

    const performance = new GoogleAdsPerformance();
    performance.campaignId = campaignId;
    performance.campaignChannelId = campaignChannelId || 0;
    performance.userId = userId || 0;
    performance.customerId = customerId || 0;
    performance.currencyId = currencyId || 0;
    performance.date = new Date(date);
    performance.campaignName = campaignName || "";
    performance.adGroupName = adGroupName || "";
    performance.adId = adId || "";
    performance.keyword = keyword || "";
    performance.impressions = impressions || 0;
    performance.clicks = clicks || 0;
    performance.conversions = conversions || 0;
    performance.cost = cost || 0;
    performance.revenue = revenue || 0;
    performance.ctr = ctr || 0;
    performance.cpc = cpc || 0;
    performance.cpm = cpm || 0;
    performance.cpa = cpa || 0;
    performance.conversionRate = conversionRate || 0;
    performance.roas = roas || 0;
    performance.roi = roi || 0;
    performance.qualityScore = qualityScore || 0;
    performance.avgCpc = avgCpc || 0;
    performance.avgPosition = avgPosition || 0;
    performance.searchImpressions = searchImpressions || 0;
    performance.searchClicks = searchClicks || 0;
    performance.searchCtr = searchCtr || 0;
    performance.searchCost = searchCost || 0;
    performance.displayImpressions = displayImpressions || 0;
    performance.displayClicks = displayClicks || 0;
    performance.displayCtr = displayCtr || 0;
    performance.displayCost = displayCost || 0;
    performance.videoViews = videoViews || 0;
    performance.videoClicks = videoClicks || 0;
    performance.videoViewRate = videoViewRate || 0;
    performance.videoCost = videoCost || 0;
    performance.shoppingImpressions = shoppingImpressions || 0;
    performance.shoppingClicks = shoppingClicks || 0;
    performance.shoppingCtr = shoppingCtr || 0;
    performance.shoppingCost = shoppingCost || 0;
    performance.ageGroupBreakdown = ageGroupBreakdown || {};
    performance.genderBreakdown = genderBreakdown || {};
    performance.locationBreakdown = locationBreakdown || {};
    performance.deviceBreakdown = deviceBreakdown || {};
    performance.timeBreakdown = timeBreakdown || {};
    performance.interestBreakdown = interestBreakdown || {};
    performance.remarketingBreakdown = remarketingBreakdown || {};
    performance.campaignType = campaignType || "";
    performance.biddingStrategy = biddingStrategy || "";
    performance.networkType = networkType || "";
    performance.budget = budget || 0;
    performance.dailyBudget = dailyBudget || 0;
    performance.isDelete = false;
    performance.createdAt = new Date();
    performance.updatedAt = new Date();

    const savedPerformance = await googleAdsPerfRepo.save(performance);

    return res.status(201).json({
      success: true,
      data: savedPerformance,
      message: 'Google Ads performance record created successfully'
    });

  } catch (error) {
    console.error('Error creating Google Ads performance:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/performance/google-ads:
 *   get:
 *     summary: Get Google Ads performance data
 *     tags: [Marketing Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: campaignId
 *         schema:
 *           type: number
 *         description: Filter by campaign ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date
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
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Google Ads performance data
 */
export const getGoogleAdsPerformance = async (req: Request, res: Response): Promise<any> => {
  try {
    const { campaignId, startDate, endDate } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    const qb = googleAdsPerfRepo.createQueryBuilder("perf")
      .where("perf.isDelete = :isDelete", { isDelete: false });

    if (userRole !== "super_admin") {
      qb.andWhere("perf.userId = :userId", { userId });
    }

    if (campaignId) {
      qb.andWhere("perf.campaignId = :campaignId", { campaignId: Number(campaignId) });
    }

    if (startDate) {
      qb.andWhere("perf.date >= :startDate", { startDate: new Date(startDate as string) });
    }

    if (endDate) {
      qb.andWhere("perf.date <= :endDate", { endDate: new Date(endDate as string) });
    }

    const [performance, total] = await qb
      .orderBy("perf.date", "DESC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return res.json({
      success: true,
      data: performance,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Error getting Google Ads performance:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
