import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { MarketingCampaign } from "../entity/MarketingCampaign";
import { Lead } from "../entity/Lead";

const campaignRepo = AppDataSource.getRepository(MarketingCampaign);
const leadRepo = AppDataSource.getRepository(Lead);

/**
 * @swagger
 * /api/marketing/campaigns/bulk:
 *   post:
 *     summary: Bulk create campaigns
 *     tags: [Marketing Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - campaigns
 *             properties:
 *               campaigns:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - campaignName
 *                     - campaignType
 *                   properties:
 *                     campaignName:
 *                       type: string
 *                     description:
 *                       type: string
 *                     campaignType:
 *                       type: string
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                     budget:
 *                       type: number
 *                     status:
 *                       type: string
 *     responses:
 *       201:
 *         description: Campaigns created successfully
 */
export const bulkCreateCampaigns = async (req: Request, res: Response): Promise<any> => {
  try {
    const { campaigns } = req.body;
    const userId = (req as any).user.id;

    if (!campaigns || !Array.isArray(campaigns) || campaigns.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Campaigns array is required and must not be empty"
      });
    }

    if (campaigns.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Maximum 50 campaigns can be created at once"
      });
    }

    const createdCampaigns = [];
    const errors = [];

    for (let i = 0; i < campaigns.length; i++) {
      try {
        const campaignData = campaigns[i];
        
        if (!campaignData.campaignName || !campaignData.campaignType) {
          errors.push({
            index: i,
            error: "Campaign name and type are required"
          });
          continue;
        }

        const campaign = new MarketingCampaign();
        campaign.userId = userId;
        campaign.campaignName = campaignData.campaignName;
        campaign.description = campaignData.description || "";
        campaign.campaignType = campaignData.campaignType;
        campaign.startDate = campaignData.startDate ? new Date(campaignData.startDate) : new Date();
        campaign.endDate = campaignData.endDate ? new Date(campaignData.endDate) : new Date();
        campaign.budget = campaignData.budget || 0;
        campaign.status = campaignData.status || "Draft";
        campaign.audienceTargeting = campaignData.audienceTargeting || "";
        campaign.content = campaignData.content || "";
        campaign.subjectLine = campaignData.subjectLine || "";
        campaign.scheduleConfig = campaignData.scheduleConfig || {};
        campaign.campaignSettings = campaignData.campaignSettings || {};
        campaign.businessId = campaignData.businessId || 0;
        campaign.customerId = campaignData.customerId || 0;
        campaign.currencyId = campaignData.currencyId || 0;
        campaign.packageId = campaignData.packageId || 0;
        campaign.subscriptionId = campaignData.subscriptionId || 0;
        campaign.orderId = 0;
        campaign.transactionId = 0;
        campaign.isDelete = false;
        campaign.createdAt = new Date();
        campaign.updatedAt = new Date();

        const savedCampaign = await campaignRepo.save(campaign);
        createdCampaigns.push({
          index: i,
          campaign: savedCampaign,
          campaignId: `Camp-${savedCampaign.id.toString().padStart(3, '0')}`
        });

      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    return res.status(201).json({
      success: true,
      data: {
        created: createdCampaigns,
        errors: errors,
        summary: {
          total: campaigns.length,
          successful: createdCampaigns.length,
          failed: errors.length
        }
      },
      message: `Bulk campaign creation completed. ${createdCampaigns.length} successful, ${errors.length} failed.`
    });

  } catch (error) {
    console.error('Error in bulk campaign creation:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/campaigns/bulk:
 *   put:
 *     summary: Bulk update campaigns
 *     tags: [Marketing Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - campaignIds
 *               - updateData
 *             properties:
 *               campaignIds:
 *                 type: array
 *                 items:
 *                   type: number
 *               updateData:
 *                 type: object
 *                 properties:
 *                   status:
 *                     type: string
 *                   budget:
 *                     type: number
 *                   endDate:
 *                     type: string
 *                     format: date-time
 *     responses:
 *       200:
 *         description: Campaigns updated successfully
 */
export const bulkUpdateCampaigns = async (req: Request, res: Response): Promise<any> => {
  try {
    const { campaignIds, updateData } = req.body;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    if (!campaignIds || !Array.isArray(campaignIds) || campaignIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Campaign IDs array is required and must not be empty"
      });
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Update data is required"
      });
    }

    if (campaignIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Maximum 100 campaigns can be updated at once"
      });
    }

    const qb = campaignRepo.createQueryBuilder("campaign")
      .where("campaign.id IN (:...campaignIds)", { campaignIds })
      .andWhere("campaign.isDelete = :isDelete", { isDelete: false });

    if (userRole !== "super_admin") {
      qb.andWhere("campaign.userId = :userId", { userId });
    }

    const campaigns = await qb.getMany();

    if (campaigns.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No campaigns found to update"
      });
    }

    // Update campaigns
    campaigns.forEach(campaign => {
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
    });

    await campaignRepo.save(campaigns);

    return res.json({
      success: true,
      data: {
        updatedCount: campaigns.length,
        campaignIds: campaigns.map(c => c.id)
      },
      message: `${campaigns.length} campaigns updated successfully`
    });

  } catch (error) {
    console.error('Error in bulk campaign update:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/campaigns/bulk:
 *   delete:
 *     summary: Bulk delete campaigns
 *     tags: [Marketing Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - campaignIds
 *             properties:
 *               campaignIds:
 *                 type: array
 *                 items:
 *                   type: number
 *     responses:
 *       200:
 *         description: Campaigns deleted successfully
 */
export const bulkDeleteCampaigns = async (req: Request, res: Response): Promise<any> => {
  try {
    const { campaignIds } = req.body;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    if (!campaignIds || !Array.isArray(campaignIds) || campaignIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Campaign IDs array is required and must not be empty"
      });
    }

    if (campaignIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Maximum 100 campaigns can be deleted at once"
      });
    }

    const qb = campaignRepo.createQueryBuilder("campaign")
      .where("campaign.id IN (:...campaignIds)", { campaignIds })
      .andWhere("campaign.isDelete = :isDelete", { isDelete: false });

    if (userRole !== "super_admin") {
      qb.andWhere("campaign.userId = :userId", { userId });
    }

    const campaigns = await qb.getMany();

    if (campaigns.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No campaigns found to delete"
      });
    }

    // Soft delete campaigns
    campaigns.forEach(campaign => {
      campaign.isDelete = true;
      campaign.updatedAt = new Date();
    });

    await campaignRepo.save(campaigns);

    return res.json({
      success: true,
      data: {
        deletedCount: campaigns.length,
        campaignIds: campaigns.map(c => c.id)
      },
      message: `${campaigns.length} campaigns deleted successfully`
    });

  } catch (error) {
    console.error('Error in bulk campaign delete:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/leads/bulk:
 *   post:
 *     summary: Bulk create leads
 *     tags: [Marketing Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - leads
 *             properties:
 *               leads:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - leadName
 *                   properties:
 *                     leadName:
 *                       type: string
 *                     email:
 *                       type: string
 *                     phoneNumber:
 *                       type: string
 *                     company:
 *                       type: string
 *                     leadSource:
 *                       type: string
 *                     status:
 *                       type: string
 *     responses:
 *       201:
 *         description: Leads created successfully
 */
export const bulkCreateLeads = async (req: Request, res: Response): Promise<any> => {
  try {
    const { leads } = req.body;

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Leads array is required and must not be empty"
      });
    }

    if (leads.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Maximum 100 leads can be created at once"
      });
    }

    const createdLeads = [];
    const errors = [];

    for (let i = 0; i < leads.length; i++) {
      try {
        const leadData = leads[i];
        
        if (!leadData.leadName) {
          errors.push({
            index: i,
            error: "Lead name is required"
          });
          continue;
        }

        const lead = new Lead();
        lead.leadName = leadData.leadName;
        lead.email = leadData.email || "";
        lead.phoneNumber = leadData.phoneNumber || "";
        lead.company = leadData.company || "";
        lead.jobTitle = leadData.jobTitle || "";
        lead.leadSource = leadData.leadSource || "Website";
        lead.status = leadData.status || "New";
        lead.notes = leadData.notes || "";
        lead.estimatedValue = leadData.estimatedValue || 0;
        lead.customFields = leadData.customFields || {};
        lead.website = leadData.website || "";
        lead.linkedinUrl = leadData.linkedinUrl || "";
        lead.twitterHandle = leadData.twitterHandle || "";
        lead.address = leadData.address || "";
        lead.city = leadData.city || "";
        lead.state = leadData.state || "";
        lead.country = leadData.country || "";
        lead.postalCode = leadData.postalCode || "";
        lead.userId = leadData.userId || 0;
        lead.businessId = leadData.businessId || 0;
        lead.customerId = leadData.customerId || 0;
        lead.campaignId = leadData.campaignId || 0;
        lead.campaignChannelId = leadData.campaignChannelId || 0;
        lead.emailCampaignId = leadData.emailCampaignId || 0;
        lead.socialPostId = leadData.socialPostId || 0;
        lead.smsCampaignId = leadData.smsCampaignId || 0;
        lead.googleAdsId = leadData.googleAdsId || 0;
        lead.lastContacted = new Date();
        lead.convertedAt = new Date();
        lead.isDelete = false;
        lead.createdAt = new Date();
        lead.updatedAt = new Date();

        const savedLead = await leadRepo.save(lead);
        createdLeads.push({
          index: i,
          lead: savedLead
        });

      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    return res.status(201).json({
      success: true,
      data: {
        created: createdLeads,
        errors: errors,
        summary: {
          total: leads.length,
          successful: createdLeads.length,
          failed: errors.length
        }
      },
      message: `Bulk lead creation completed. ${createdLeads.length} successful, ${errors.length} failed.`
    });

  } catch (error) {
    console.error('Error in bulk lead creation:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/leads/bulk:
 *   put:
 *     summary: Bulk update leads
 *     tags: [Marketing Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - leadIds
 *               - updateData
 *             properties:
 *               leadIds:
 *                 type: array
 *                 items:
 *                   type: number
 *               updateData:
 *                 type: object
 *                 properties:
 *                   status:
 *                     type: string
 *                   estimatedValue:
 *                     type: number
 *                   notes:
 *                     type: string
 *     responses:
 *       200:
 *         description: Leads updated successfully
 */
export const bulkUpdateLeads = async (req: Request, res: Response): Promise<any> => {
  try {
    const { leadIds, updateData } = req.body;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Lead IDs array is required and must not be empty"
      });
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Update data is required"
      });
    }

    if (leadIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Maximum 100 leads can be updated at once"
      });
    }

    const qb = leadRepo.createQueryBuilder("lead")
      .where("lead.id IN (:...leadIds)", { leadIds })
      .andWhere("lead.isDelete = :isDelete", { isDelete: false });

    if (userRole !== "super_admin") {
      qb.andWhere("lead.userId = :userId", { userId });
    }

    const leads = await qb.getMany();

    if (leads.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No leads found to update"
      });
    }

    // Update leads
    leads.forEach(lead => {
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined && (lead as any).hasOwnProperty(key)) {
          if (key === 'lastContacted' || key === 'convertedAt') {
            (lead as any)[key] = updateData[key] ? new Date(updateData[key]) : null;
          } else {
            (lead as any)[key] = updateData[key];
          }
        }
      });
      lead.updatedAt = new Date();
    });

    await leadRepo.save(leads);

    return res.json({
      success: true,
      data: {
        updatedCount: leads.length,
        leadIds: leads.map(l => l.id)
      },
      message: `${leads.length} leads updated successfully`
    });

  } catch (error) {
    console.error('Error in bulk lead update:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
