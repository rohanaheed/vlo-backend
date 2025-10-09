import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { MarketingCampaign } from "../entity/MarketingCampaign";
import { Lead } from "../entity/Lead";
import { EmailPerformance } from "../entity/EmailPerformance";
import { SocialMediaPerformance } from "../entity/SocialMediaPerformance";
import { SMSPerformance } from "../entity/SMSPerformance";
import { GoogleAdsPerformance } from "../entity/GoogleAdsPerformance";

const campaignRepo = AppDataSource.getRepository(MarketingCampaign);
const leadRepo = AppDataSource.getRepository(Lead);
const emailPerfRepo = AppDataSource.getRepository(EmailPerformance);
const socialPerfRepo = AppDataSource.getRepository(SocialMediaPerformance);
const smsPerfRepo = AppDataSource.getRepository(SMSPerformance);
const googleAdsPerfRepo = AppDataSource.getRepository(GoogleAdsPerformance);

/**
 * @swagger
 * /api/marketing/dashboard/overview:
 *   get:
 *     summary: Get marketing dashboard overview statistics
 *     tags: [Marketing Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter data from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter data to this date
 *       - in: query
 *         name: campaignType
 *         schema:
 *           type: string
 *         description: Filter by campaign type
 *     responses:
 *       200:
 *         description: Dashboard overview statistics
 */
export const getDashboardOverview = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const { startDate, endDate, campaignType } = req.query;

    // Build base query conditions
    const baseConditions: any = { isDelete: false };
    if (userRole !== "super_admin") {
      baseConditions.userId = userId;
    }

    // Get campaign statistics
    const campaignQuery = campaignRepo.createQueryBuilder("campaign")
      .where("campaign.isDelete = :isDelete", { isDelete: false });

    if (userRole !== "super_admin") {
      campaignQuery.andWhere("campaign.userId = :userId", { userId });
    }

    if (startDate) {
      campaignQuery.andWhere("campaign.startDate >= :startDate", { startDate: new Date(startDate as string) });
    }

    if (endDate) {
      campaignQuery.andWhere("campaign.endDate <= :endDate", { endDate: new Date(endDate as string) });
    }

    if (campaignType) {
      campaignQuery.andWhere("campaign.campaignType = :campaignType", { campaignType });
    }

    // Get lead statistics
    const leadQuery = leadRepo.createQueryBuilder("lead")
      .where("lead.isDelete = :isDelete", { isDelete: false });

    if (userRole !== "super_admin") {
      leadQuery.andWhere("lead.userId = :userId", { userId });
    }

    if (startDate) {
      leadQuery.andWhere("lead.createdAt >= :startDate", { startDate: new Date(startDate as string) });
    }

    if (endDate) {
      leadQuery.andWhere("lead.createdAt <= :endDate", { endDate: new Date(endDate as string) });
    }

    // Parallel execution of all queries
    const [
      totalCampaigns,
      activeCampaigns,
      completedCampaigns,
      campaignBudget,
      campaignsByType,
      campaignsByStatus,
      totalLeads,
      convertedLeads,
      leadsBySource,
      leadsByStatus,
      totalLeadValue,
      recentCampaigns,
      recentLeads
    ] = await Promise.all([
      // Campaign counts
      campaignQuery.clone().getCount(),
      campaignQuery.clone().andWhere("campaign.status = :status", { status: "Active" }).getCount(),
      campaignQuery.clone().andWhere("campaign.status = :status", { status: "Completed" }).getCount(),
      
      // Campaign budget
      campaignQuery.clone()
        .select("SUM(campaign.budget)", "totalBudget")
        .getRawOne(),

      // Campaigns by type
      campaignQuery.clone()
        .select("campaign.campaignType", "type")
        .addSelect("COUNT(*)", "count")
        .groupBy("campaign.campaignType")
        .getRawMany(),

      // Campaigns by status
      campaignQuery.clone()
        .select("campaign.status", "status")
        .addSelect("COUNT(*)", "count")
        .groupBy("campaign.status")
        .getRawMany(),

      // Lead counts
      leadQuery.clone().getCount(),
      leadQuery.clone().andWhere("lead.status = :status", { status: "Converted" }).getCount(),
      
      // Leads by source
      leadQuery.clone()
        .select("lead.leadSource", "source")
        .addSelect("COUNT(*)", "count")
        .groupBy("lead.leadSource")
        .getRawMany(),

      // Leads by status
      leadQuery.clone()
        .select("lead.status", "status")
        .addSelect("COUNT(*)", "count")
        .groupBy("lead.status")
        .getRawMany(),

      // Total lead value
      leadQuery.clone()
        .select("SUM(lead.estimatedValue)", "totalValue")
        .getRawOne(),

      // Recent campaigns
      campaignQuery.clone()
        .orderBy("campaign.createdAt", "DESC")
        .limit(5)
        .getMany(),

      // Recent leads
      leadQuery.clone()
        .orderBy("lead.createdAt", "DESC")
        .limit(5)
        .getMany()
    ]);

    // Calculate conversion rate
    const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100) : 0;

    return res.json({
      success: true,
      data: {
        campaigns: {
          total: totalCampaigns,
          active: activeCampaigns,
          completed: completedCampaigns,
          totalBudget: Number(campaignBudget?.totalBudget) || 0,
          byType: campaignsByType.map(item => ({
            type: item.type,
            count: Number(item.count)
          })),
          byStatus: campaignsByStatus.map(item => ({
            status: item.status,
            count: Number(item.count)
          }))
        },
        leads: {
          total: totalLeads,
          converted: convertedLeads,
          conversionRate: Number(conversionRate.toFixed(2)),
          totalValue: Number(totalLeadValue?.totalValue) || 0,
          bySource: leadsBySource.map(item => ({
            source: item.source,
            count: Number(item.count)
          })),
          byStatus: leadsByStatus.map(item => ({
            status: item.status,
            count: Number(item.count)
          }))
        },
        recent: {
          campaigns: recentCampaigns.map(campaign => ({
            id: campaign.id,
            campaignId: `Camp-${campaign.id.toString().padStart(3, '0')}`,
            name: campaign.campaignName,
            type: campaign.campaignType,
            status: campaign.status,
            budget: campaign.budget,
            createdAt: campaign.createdAt
          })),
          leads: recentLeads.map(lead => ({
            id: lead.id,
            name: lead.leadName,
            email: lead.email,
            company: lead.company,
            source: lead.leadSource,
            status: lead.status,
            estimatedValue: lead.estimatedValue,
            createdAt: lead.createdAt
          }))
        }
      },
      message: 'Dashboard overview statistics retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting dashboard overview:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/dashboard/performance:
 *   get:
 *     summary: Get marketing performance analytics
 *     tags: [Marketing Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter data from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter data to this date
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: daily
 *         description: Aggregation period
 *     responses:
 *       200:
 *         description: Performance analytics data
 */
export const getPerformanceAnalytics = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const { startDate, endDate, period = "daily" } = req.query;

    const baseConditions: any = { isDelete: false };
    if (userRole !== "super_admin") {
      baseConditions.userId = userId;
    }

    // Build date filter
    let dateFilter = "";
    if (startDate && endDate) {
      dateFilter = `AND date BETWEEN '${startDate}' AND '${endDate}'`;
    }

    // Get performance data by period
    const [emailPerf, socialPerf, smsPerf, googleAdsPerf] = await Promise.all([
      // Email performance
      emailPerfRepo.query(`
        SELECT 
          ${period === 'daily' ? 'DATE(date)' : period === 'weekly' ? 'YEARWEEK(date)' : 'DATE_FORMAT(date, "%Y-%m")'} as period,
          SUM(emailsSent) as emailsSent,
          SUM(totalOpened) as totalOpened,
          SUM(totalClicked) as totalClicked,
          AVG(openRate) as avgOpenRate,
          AVG(clickRate) as avgClickRate,
          SUM(revenue) as revenue,
          SUM(conversions) as conversions
        FROM email_performance 
        WHERE isDelete = false ${dateFilter}
        GROUP BY period
        ORDER BY period ASC
      `),

      // Social media performance
      socialPerfRepo.query(`
        SELECT 
          ${period === 'daily' ? 'DATE(date)' : period === 'weekly' ? 'YEARWEEK(date)' : 'DATE_FORMAT(date, "%Y-%m")'} as period,
          channelType,
          SUM(impressions) as impressions,
          SUM(reach) as reach,
          SUM(engagements) as engagements,
          SUM(likes) as likes,
          SUM(comments) as comments,
          SUM(shares) as shares,
          AVG(engagementRate) as avgEngagementRate,
          SUM(revenue) as revenue,
          SUM(conversions) as conversions
        FROM social_media_performance 
        WHERE isDelete = false ${dateFilter}
        GROUP BY period, channelType
        ORDER BY period ASC
      `),

      // SMS performance
      smsPerfRepo.query(`
        SELECT 
          ${period === 'daily' ? 'DATE(date)' : period === 'weekly' ? 'YEARWEEK(date)' : 'DATE_FORMAT(date, "%Y-%m")'} as period,
          SUM(smsSent) as smsSent,
          SUM(delivered) as delivered,
          SUM(failed) as failed,
          SUM(replies) as replies,
          SUM(optOuts) as optOuts,
          AVG(deliveryRate) as avgDeliveryRate,
          SUM(cost) as cost,
          SUM(revenue) as revenue,
          SUM(conversions) as conversions
        FROM sms_performance 
        WHERE isDelete = false ${dateFilter}
        GROUP BY period
        ORDER BY period ASC
      `),

      // Google Ads performance
      googleAdsPerfRepo.query(`
        SELECT 
          ${period === 'daily' ? 'DATE(date)' : period === 'weekly' ? 'YEARWEEK(date)' : 'DATE_FORMAT(date, "%Y-%m")'} as period,
          SUM(impressions) as impressions,
          SUM(clicks) as clicks,
          SUM(cost) as cost,
          SUM(revenue) as revenue,
          AVG(ctr) as avgCtr,
          AVG(cpc) as avgCpc,
          AVG(roas) as avgRoas,
          SUM(conversions) as conversions
        FROM google_ads_performance 
        WHERE isDelete = false ${dateFilter}
        GROUP BY period
        ORDER BY period ASC
      `)
    ]);

    // Calculate totals and trends
    const totals = {
      email: {
        totalSent: emailPerf.reduce((sum: number, item: any) => sum + (Number(item.emailsSent) || 0), 0),
        totalOpened: emailPerf.reduce((sum: number, item: any) => sum + (Number(item.totalOpened) || 0), 0),
        totalClicked: emailPerf.reduce((sum: number, item: any) => sum + (Number(item.totalClicked) || 0), 0),
        avgOpenRate: emailPerf.length > 0 ? emailPerf.reduce((sum: number, item: any) => sum + (Number(item.avgOpenRate) || 0), 0) / emailPerf.length : 0,
        avgClickRate: emailPerf.length > 0 ? emailPerf.reduce((sum: number, item: any) => sum + (Number(item.avgClickRate) || 0), 0) / emailPerf.length : 0,
        totalRevenue: emailPerf.reduce((sum: number, item: any) => sum + (Number(item.revenue) || 0), 0),
        totalConversions: emailPerf.reduce((sum: number, item: any) => sum + (Number(item.conversions) || 0), 0)
      },
      social: {
        totalImpressions: socialPerf.reduce((sum: number, item: any) => sum + (Number(item.impressions) || 0), 0),
        totalReach: socialPerf.reduce((sum: number, item: any) => sum + (Number(item.reach) || 0), 0),
        totalEngagements: socialPerf.reduce((sum: number, item: any) => sum + (Number(item.engagements) || 0), 0),
        totalLikes: socialPerf.reduce((sum: number, item: any) => sum + (Number(item.likes) || 0), 0),
        totalComments: socialPerf.reduce((sum: number, item: any) => sum + (Number(item.comments) || 0), 0),
        totalShares: socialPerf.reduce((sum: number, item: any) => sum + (Number(item.shares) || 0), 0),
        avgEngagementRate: socialPerf.length > 0 ? socialPerf.reduce((sum: number, item: any) => sum + (Number(item.avgEngagementRate) || 0), 0) / socialPerf.length : 0,
        totalRevenue: socialPerf.reduce((sum: number, item: any) => sum + (Number(item.revenue) || 0), 0),
        totalConversions: socialPerf.reduce((sum: number, item: any) => sum + (Number(item.conversions) || 0), 0)
      },
      sms: {
        totalSent: smsPerf.reduce((sum: number, item: any) => sum + (Number(item.smsSent) || 0), 0),
        totalDelivered: smsPerf.reduce((sum: number, item: any) => sum + (Number(item.delivered) || 0), 0),
        totalFailed: smsPerf.reduce((sum: number, item: any) => sum + (Number(item.failed) || 0), 0),
        totalReplies: smsPerf.reduce((sum: number, item: any) => sum + (Number(item.replies) || 0), 0),
        totalOptOuts: smsPerf.reduce((sum: number, item: any) => sum + (Number(item.optOuts) || 0), 0),
        avgDeliveryRate: smsPerf.length > 0 ? smsPerf.reduce((sum: number, item: any) => sum + (Number(item.avgDeliveryRate) || 0), 0) / smsPerf.length : 0,
        totalCost: smsPerf.reduce((sum: number, item: any) => sum + (Number(item.cost) || 0), 0),
        totalRevenue: smsPerf.reduce((sum: number, item: any) => sum + (Number(item.revenue) || 0), 0),
        totalConversions: smsPerf.reduce((sum: number, item: any) => sum + (Number(item.conversions) || 0), 0)
      },
      googleAds: {
        totalImpressions: googleAdsPerf.reduce((sum: number, item: any) => sum + (Number(item.impressions) || 0), 0),
        totalClicks: googleAdsPerf.reduce((sum: number, item: any) => sum + (Number(item.clicks) || 0), 0),
        totalCost: googleAdsPerf.reduce((sum: number, item: any) => sum + (Number(item.cost) || 0), 0),
        totalRevenue: googleAdsPerf.reduce((sum: number, item: any) => sum + (Number(item.revenue) || 0), 0),
        avgCtr: googleAdsPerf.length > 0 ? googleAdsPerf.reduce((sum: number, item: any) => sum + (Number(item.avgCtr) || 0), 0) / googleAdsPerf.length : 0,
        avgCpc: googleAdsPerf.length > 0 ? googleAdsPerf.reduce((sum: number, item: any) => sum + (Number(item.avgCpc) || 0), 0) / googleAdsPerf.length : 0,
        avgRoas: googleAdsPerf.length > 0 ? googleAdsPerf.reduce((sum: number, item: any) => sum + (Number(item.avgRoas) || 0), 0) / googleAdsPerf.length : 0,
        totalConversions: googleAdsPerf.reduce((sum: number, item: any) => sum + (Number(item.conversions) || 0), 0)
      }
    };

    return res.json({
      success: true,
      data: {
        period: period,
        totals: totals,
        trends: {
          email: emailPerf,
          social: socialPerf,
          sms: smsPerf,
          googleAds: googleAdsPerf
        }
      },
      message: 'Performance analytics retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting performance analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/dashboard/revenue:
 *   get:
 *     summary: Get marketing revenue analytics
 *     tags: [Marketing Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter data from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter data to this date
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [campaign, channel, source]
 *           default: campaign
 *         description: Group revenue by
 *     responses:
 *       200:
 *         description: Revenue analytics data
 */
export const getRevenueAnalytics = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const { startDate, endDate, groupBy = "campaign" } = req.query;

    const dateFilter = startDate && endDate ? `AND date BETWEEN '${startDate}' AND '${endDate}'` : '';

    // Get revenue data grouped by specified field
    let revenueQuery = '';
    switch (groupBy) {
      case 'campaign':
        revenueQuery = `
          SELECT 
            campaignName,
            campaignType,
            SUM(revenue) as totalRevenue,
            SUM(cost) as totalCost,
            SUM(conversions) as totalConversions,
            AVG(ROI) as avgROI
          FROM (
            SELECT campaignName, 'Email' as campaignType, revenue, 0 as cost, conversions, (revenue - 0) / NULLIF(0, 0) as ROI FROM email_performance WHERE isDelete = false ${dateFilter}
            UNION ALL
            SELECT campaignName, 'Social Media' as campaignType, revenue, 0 as cost, conversions, (revenue - 0) / NULLIF(0, 0) as ROI FROM social_media_performance WHERE isDelete = false ${dateFilter}
            UNION ALL
            SELECT campaignName, 'SMS' as campaignType, revenue, cost, conversions, (revenue - cost) / NULLIF(cost, 0) as ROI FROM sms_performance WHERE isDelete = false ${dateFilter}
            UNION ALL
            SELECT campaignName, 'Google Ads' as campaignType, revenue, cost, conversions, (revenue - cost) / NULLIF(cost, 0) as ROI FROM google_ads_performance WHERE isDelete = false ${dateFilter}
          ) combined
          GROUP BY campaignName, campaignType
          ORDER BY totalRevenue DESC
        `;
        break;
      case 'channel':
        revenueQuery = `
          SELECT 
            campaignType,
            SUM(revenue) as totalRevenue,
            SUM(cost) as totalCost,
            SUM(conversions) as totalConversions,
            AVG(CASE 
              WHEN cost > 0 THEN (revenue - cost) / cost 
              ELSE NULL 
            END) as avgROI
          FROM (
            SELECT 'Email' as campaignType, revenue, 0 as cost, conversions FROM email_performance WHERE isDelete = false ${dateFilter}
            UNION ALL
            SELECT 'Social Media' as campaignType, revenue, 0 as cost, conversions FROM social_media_performance WHERE isDelete = false ${dateFilter}
            UNION ALL
            SELECT 'SMS' as campaignType, revenue, cost, conversions FROM sms_performance WHERE isDelete = false ${dateFilter}
            UNION ALL
            SELECT 'Google Ads' as campaignType, revenue, cost, conversions FROM google_ads_performance WHERE isDelete = false ${dateFilter}
          ) combined
          GROUP BY campaignType
          ORDER BY totalRevenue DESC
        `;
        break;
      case 'source':
        revenueQuery = `
          SELECT 
            leadSource,
            SUM(estimatedValue) as totalValue,
            COUNT(*) as totalLeads,
            SUM(CASE WHEN status = 'Converted' THEN estimatedValue ELSE 0 END) as convertedValue,
            SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) as convertedLeads
          FROM lead 
          WHERE isDelete = false ${dateFilter}
          GROUP BY leadSource
          ORDER BY totalValue DESC
        `;
        break;
    }

    const revenueData = await AppDataSource.query(revenueQuery);

    // Calculate totals
    const totals = {
      totalRevenue: revenueData.reduce((sum: number, item: any) => sum + (Number(item.totalRevenue) || Number(item.totalValue) || 0), 0),
      totalCost: revenueData.reduce((sum: number, item: any) => sum + (Number(item.totalCost) || 0), 0),
      totalConversions: revenueData.reduce((sum: number, item: any) => sum + (Number(item.totalConversions) || 0), 0),
      totalLeads: revenueData.reduce((sum: number, item: any) => sum + (Number(item.totalLeads) || 0), 0),
      convertedValue: revenueData.reduce((sum: number, item: any) => sum + (Number(item.convertedValue) || 0), 0),
      convertedLeads: revenueData.reduce((sum: number, item: any) => sum + (Number(item.convertedLeads) || 0), 0)
    };

    // Calculate ROI
    const totalROI = totals.totalCost > 0 ? ((totals.totalRevenue - totals.totalCost) / totals.totalCost) * 100 : 0;
    const conversionRate = totals.totalLeads > 0 ? (totals.convertedLeads / totals.totalLeads) * 100 : 0;

    return res.json({
      success: true,
      data: {
        groupBy: groupBy,
        totals: {
          ...totals,
          totalROI: Number(totalROI.toFixed(2)),
          conversionRate: Number(conversionRate.toFixed(2))
        },
        breakdown: revenueData.map((item: any) => ({
          ...item,
          totalRevenue: Number(item.totalRevenue || item.totalValue || 0),
          totalCost: Number(item.totalCost || 0),
          totalConversions: Number(item.totalConversions || 0),
          totalLeads: Number(item.totalLeads || 0),
          convertedValue: Number(item.convertedValue || 0),
          convertedLeads: Number(item.convertedLeads || 0),
          avgROI: Number(item.avgROI || 0)
        }))
      },
      message: 'Revenue analytics retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting revenue analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
