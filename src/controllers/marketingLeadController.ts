import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { Lead } from "../entity/Lead";

const leadRepo = AppDataSource.getRepository(Lead);

/**
 * @swagger
 * /api/marketing/leads:
 *   post:
 *     summary: Create a new lead
 *     tags: [Marketing Leads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - leadName
 *             properties:
 *               leadName:
 *                 type: string
 *               email:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               company:
 *                 type: string
 *               jobTitle:
 *                 type: string
 *               leadSource:
 *                 type: string
 *                 enum: [Website, Referral, Email Campaign, Social Media, Google Ads, Cold Call, Trade Show, Other]
 *               status:
 *                 type: string
 *                 enum: [New, Contacted, Qualified, Unqualified, Converted, Lost]
 *               notes:
 *                 type: string
 *               estimatedValue:
 *                 type: number
 *               customFields:
 *                 type: object
 *               website:
 *                 type: string
 *               linkedinUrl:
 *                 type: string
 *               twitterHandle:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               country:
 *                 type: string
 *               postalCode:
 *                 type: string
 *               userId:
 *                 type: number
 *               businessId:
 *                 type: number
 *               customerId:
 *                 type: number
 *               campaignId:
 *                 type: number
 *               campaignChannelId:
 *                 type: number
 *               emailCampaignId:
 *                 type: number
 *               socialPostId:
 *                 type: number
 *               smsCampaignId:
 *                 type: number
 *               googleAdsId:
 *                 type: number
 *     responses:
 *       201:
 *         description: Lead created successfully
 *       400:
 *         description: Validation error
 */
export const createLead = async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      leadName,
      email,
      phoneNumber,
      company,
      jobTitle,
      leadSource = "Website",
      status = "New",
      notes,
      estimatedValue,
      customFields,
      website,
      linkedinUrl,
      twitterHandle,
      address,
      city,
      state,
      country,
      postalCode,
      userId,
      businessId,
      customerId,
      campaignId,
      campaignChannelId,
      emailCampaignId,
      socialPostId,
      smsCampaignId,
      googleAdsId
    } = req.body;

    if (!leadName) {
      return res.status(400).json({
        success: false,
        message: "Lead name is required"
      });
    }

    const lead = new Lead();
    lead.userId = userId || 0;
    lead.businessId = businessId || 0;
    lead.customerId = customerId || 0;
    lead.campaignId = campaignId || 0;
    lead.campaignChannelId = campaignChannelId || 0;
    lead.emailCampaignId = emailCampaignId || 0;
    lead.socialPostId = socialPostId || 0;
    lead.smsCampaignId = smsCampaignId || 0;
    lead.googleAdsId = googleAdsId || 0;
    lead.leadName = leadName;
    lead.email = email || "";
    lead.phoneNumber = phoneNumber || "";
    lead.company = company || "";
    lead.jobTitle = jobTitle || "";
    lead.leadSource = leadSource;
    lead.status = status;
    lead.notes = notes || "";
    lead.estimatedValue = estimatedValue || 0;
    lead.customFields = customFields || {};
    lead.website = website || "";
    lead.linkedinUrl = linkedinUrl || "";
    lead.twitterHandle = twitterHandle || "";
    lead.address = address || "";
    lead.city = city || "";
    lead.state = state || "";
    lead.country = country || "";
    lead.postalCode = postalCode || "";
    lead.lastContacted = new Date();
    lead.convertedAt = new Date();
    lead.isDelete = false;
    lead.createdAt = new Date();
    lead.updatedAt = new Date();

    const savedLead = await leadRepo.save(lead);

    return res.status(201).json({
      success: true,
      data: savedLead,
      message: 'Lead created successfully'
    });

  } catch (error) {
    console.error('Error creating lead:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/leads:
 *   get:
 *     summary: Get all leads (paginated)
 *     tags: [Marketing Leads]
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
 *         description: Search leads by name, email, or company
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by lead status
 *       - in: query
 *         name: leadSource
 *         schema:
 *           type: string
 *         description: Filter by lead source
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
 *         description: Filter leads created after this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter leads created before this date
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of leads with pagination
 */
export const getAllLeads = async (req: Request, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const search = (req.query.search as string) || "";
    const status = (req.query.status as string) || "";
    const leadSource = (req.query.leadSource as string) || "";
    const campaignId = req.query.campaignId ? Number(req.query.campaignId) : null;
    const startDate = (req.query.startDate as string) || "";
    const endDate = (req.query.endDate as string) || "";
    let orderParam = (req.query.order as string)?.toLowerCase() || "desc";
    let order: "ASC" | "DESC" = orderParam === "asc" ? "ASC" : "DESC";

    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Build query with filters
    const qb = leadRepo.createQueryBuilder("lead")
      .where("lead.isDelete = :isDelete", { isDelete: false });

    // User-based filtering (non-super_admin can only see their leads)
    if (userRole !== "super_admin") {
      qb.andWhere("lead.userId = :userId", { userId });
    }

    // Search filter
    if (search.trim()) {
      qb.andWhere(
        "(lead.leadName LIKE :search OR lead.email LIKE :search OR lead.company LIKE :search)",
        { search: `%${search}%` }
      );
    }

    // Status filter
    if (status) {
      qb.andWhere("lead.status = :status", { status });
    }

    // Lead source filter
    if (leadSource) {
      qb.andWhere("lead.leadSource = :leadSource", { leadSource });
    }

    // Campaign filter
    if (campaignId) {
      qb.andWhere("lead.campaignId = :campaignId", { campaignId });
    }

    // Date filters
    if (startDate) {
      qb.andWhere("lead.createdAt >= :startDate", { startDate: new Date(startDate) });
    }
    if (endDate) {
      qb.andWhere("lead.createdAt <= :endDate", { endDate: new Date(endDate) });
    }

    // Get leads with pagination
    const [leads, total] = await qb
      .orderBy("lead.createdAt", order)
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return res.json({
      success: true,
      data: leads,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Error fetching leads:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/leads/{id}:
 *   get:
 *     summary: Get lead by ID
 *     tags: [Marketing Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Lead ID
 *     responses:
 *       200:
 *         description: Lead details
 *       404:
 *         description: Lead not found
 */
export const getLeadById = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    const qb = leadRepo.createQueryBuilder("lead")
      .where("lead.id = :id", { id: Number(id) })
      .andWhere("lead.isDelete = :isDelete", { isDelete: false });

    if (userRole !== "super_admin") {
      qb.andWhere("lead.userId = :userId", { userId });
    }

    const lead = await qb.getOne();

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found"
      });
    }

    return res.json({
      success: true,
      data: lead,
      message: 'Lead retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting lead:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/leads/{id}:
 *   put:
 *     summary: Update lead
 *     tags: [Marketing Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Lead ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               leadName:
 *                 type: string
 *               email:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               company:
 *                 type: string
 *               jobTitle:
 *                 type: string
 *               leadSource:
 *                 type: string
 *               status:
 *                 type: string
 *               notes:
 *                 type: string
 *               estimatedValue:
 *                 type: number
 *               customFields:
 *                 type: object
 *               website:
 *                 type: string
 *               linkedinUrl:
 *                 type: string
 *               twitterHandle:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               country:
 *                 type: string
 *               postalCode:
 *                 type: string
 *               lastContacted:
 *                 type: string
 *                 format: date-time
 *               convertedAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Lead updated successfully
 *       404:
 *         description: Lead not found
 */
export const updateLead = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const updateData = req.body;

    const qb = leadRepo.createQueryBuilder("lead")
      .where("lead.id = :id", { id: Number(id) })
      .andWhere("lead.isDelete = :isDelete", { isDelete: false });

    if (userRole !== "super_admin") {
      qb.andWhere("lead.userId = :userId", { userId });
    }

    const lead = await qb.getOne();

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found"
      });
    }

    // Update lead fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && (lead as any).hasOwnProperty(key)) {
        if (key === 'lastContacted' || key === 'convertedAt') {
          lead[key] = updateData[key] ? new Date(updateData[key]) : new Date();
        } else {
          (lead as any)[key] = updateData[key];
        }
      }
    });

    lead.updatedAt = new Date();
    const savedLead = await leadRepo.save(lead);

    return res.json({
      success: true,
      data: savedLead,
      message: 'Lead updated successfully'
    });

  } catch (error) {
    console.error('Error updating lead:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/leads/{id}:
 *   delete:
 *     summary: Soft delete lead
 *     tags: [Marketing Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Lead ID
 *     responses:
 *       200:
 *         description: Lead deleted successfully
 *       404:
 *         description: Lead not found
 */
export const deleteLead = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    const qb = leadRepo.createQueryBuilder("lead")
      .where("lead.id = :id", { id: Number(id) })
      .andWhere("lead.isDelete = :isDelete", { isDelete: false });

    if (userRole !== "super_admin") {
      qb.andWhere("lead.userId = :userId", { userId });
    }

    const lead = await qb.getOne();

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found"
      });
    }

    lead.isDelete = true;
    lead.updatedAt = new Date();
    await leadRepo.save(lead);

    return res.json({
      success: true,
      message: 'Lead deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting lead:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/leads/stats:
 *   get:
 *     summary: Get lead statistics
 *     tags: [Marketing Leads]
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
 *         name: campaignId
 *         schema:
 *           type: number
 *         description: Filter by campaign ID
 *     responses:
 *       200:
 *         description: Lead statistics
 */
export const getLeadStats = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const { startDate, endDate, campaignId } = req.query;

    const qb = leadRepo.createQueryBuilder("lead")
      .where("lead.isDelete = :isDelete", { isDelete: false });

    if (userRole !== "super_admin") {
      qb.andWhere("lead.userId = :userId", { userId });
    }

    if (startDate) {
      qb.andWhere("lead.createdAt >= :startDate", { startDate: new Date(startDate as string) });
    }

    if (endDate) {
      qb.andWhere("lead.createdAt <= :endDate", { endDate: new Date(endDate as string) });
    }

    if (campaignId) {
      qb.andWhere("lead.campaignId = :campaignId", { campaignId: Number(campaignId) });
    }

    // Get total leads
    const totalLeads = await qb.getCount();

    // Get leads by status
    const statusStats = await qb
      .select("lead.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("lead.status")
      .getRawMany();

    // Get leads by source
    const sourceStats = await qb
      .select("lead.leadSource", "source")
      .addSelect("COUNT(*)", "count")
      .groupBy("lead.leadSource")
      .getRawMany();

    // Get total estimated value
    const valueStats = await qb
      .select("SUM(lead.estimatedValue)", "totalValue")
      .getRawOne();

    // Get conversion rate
    const convertedLeads = await qb
      .andWhere("lead.status = :status", { status: "Converted" })
      .getCount();

    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    return res.json({
      success: true,
      data: {
        totalLeads,
        convertedLeads,
        conversionRate: Number(conversionRate.toFixed(2)),
        statusStats: statusStats.map(stat => ({
          status: stat.status,
          count: Number(stat.count)
        })),
        sourceStats: sourceStats.map(stat => ({
          source: stat.source,
          count: Number(stat.count)
        })),
        totalEstimatedValue: Number(valueStats.totalValue) || 0
      },
      message: 'Lead statistics retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting lead stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/leads/convert/{id}:
 *   post:
 *     summary: Convert lead to customer
 *     tags: [Marketing Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Lead ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               conversionValue:
 *                 type: number
 *                 description: Actual conversion value
 *               conversionNotes:
 *                 type: string
 *                 description: Notes about the conversion
 *     responses:
 *       200:
 *         description: Lead converted successfully
 *       404:
 *         description: Lead not found
 */
export const convertLead = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { conversionValue, conversionNotes } = req.body;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    const qb = leadRepo.createQueryBuilder("lead")
      .where("lead.id = :id", { id: Number(id) })
      .andWhere("lead.isDelete = :isDelete", { isDelete: false });

    if (userRole !== "super_admin") {
      qb.andWhere("lead.userId = :userId", { userId });
    }

    const lead = await qb.getOne();

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found"
      });
    }

    // Update lead status and conversion details
    lead.status = "Converted";
    lead.convertedAt = new Date();
    lead.lastContacted = new Date();
    
    if (conversionValue !== undefined) {
      lead.estimatedValue = conversionValue;
    }

    if (conversionNotes) {
      lead.notes = lead.notes ? `${lead.notes}\n\nConversion Notes: ${conversionNotes}` : `Conversion Notes: ${conversionNotes}`;
    }

    lead.updatedAt = new Date();
    const savedLead = await leadRepo.save(lead);

    return res.json({
      success: true,
      data: savedLead,
      message: 'Lead converted successfully'
    });

  } catch (error) {
    console.error('Error converting lead:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
