import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { CampaignMedia } from "../entity/CampaignMedia";

const mediaRepo = AppDataSource.getRepository(CampaignMedia);

/**
 * @swagger
 * /api/marketing/media:
 *   post:
 *     summary: Create a new campaign media
 *     tags: [Marketing Media]
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
 *               - mediaUrl
 *             properties:
 *               campaignId:
 *                 type: number
 *               campaignChannelId:
 *                 type: number
 *               mediaUrl:
 *                 type: string
 *               mediaType:
 *                 type: string
 *                 enum: [image, video, document, audio, gif]
 *               fileName:
 *                 type: string
 *               description:
 *                 type: string
 *               mimeType:
 *                 type: string
 *               fileSize:
 *                 type: number
 *               width:
 *                 type: number
 *               height:
 *                 type: number
 *               duration:
 *                 type: number
 *               thumbnailUrl:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Campaign media created successfully
 */
export const createCampaignMedia = async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      campaignId,
      campaignChannelId,
      mediaUrl,
      mediaType = "image",
      fileName,
      description,
      mimeType,
      fileSize,
      width,
      height,
      duration,
      thumbnailUrl,
      metadata = {}
    } = req.body;

    if (!campaignId || !mediaUrl) {
      return res.status(400).json({
        success: false,
        message: "Campaign ID and media URL are required"
      });
    }

    const media = new CampaignMedia();
    media.campaignId = campaignId;
    media.campaignChannelId = campaignChannelId || 0;
    media.mediaUrl = mediaUrl;
    media.mediaType = mediaType;
    media.fileName = fileName || "";
    media.description = description || "";
    media.mimeType = mimeType || "";
    media.fileSize = fileSize || 0;
    media.width = width || 0;
    media.height = height || 0;
    media.duration = duration || 0;
    media.thumbnailUrl = thumbnailUrl || "";
    media.metadata = metadata || {};
    media.isDelete = false;
    media.uploadedAt = new Date();
    media.createdAt = new Date();
    media.updatedAt = new Date();

    const savedMedia = await mediaRepo.save(media);

    return res.status(201).json({
      success: true,
      data: savedMedia,
      message: 'Campaign media created successfully'
    });

  } catch (error) {
    console.error('Error creating campaign media:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/media:
 *   get:
 *     summary: Get all campaign media (paginated)
 *     tags: [Marketing Media]
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
 *         name: campaignChannelId
 *         schema:
 *           type: number
 *         description: Filter by campaign channel ID
 *       - in: query
 *         name: mediaType
 *         schema:
 *           type: string
 *         description: Filter by media type
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of campaign media with pagination
 */
export const getAllCampaignMedia = async (req: Request, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const campaignId = req.query.campaignId ? Number(req.query.campaignId) : null;
    const campaignChannelId = req.query.campaignChannelId ? Number(req.query.campaignChannelId) : null;
    const mediaType = (req.query.mediaType as string) || "";
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : null;

    const qb = mediaRepo.createQueryBuilder("media")
      .where("media.isDelete = :isDelete", { isDelete: false });

    if (campaignId) {
      qb.andWhere("media.campaignId = :campaignId", { campaignId });
    }

    if (campaignChannelId) {
      qb.andWhere("media.campaignChannelId = :campaignChannelId", { campaignChannelId });
    }

    if (mediaType) {
      qb.andWhere("media.mediaType = :mediaType", { mediaType });
    }

    if (isActive !== null) {
      qb.andWhere("media.isActive = :isActive", { isActive });
    }

    const [media, total] = await qb
      .orderBy("media.createdAt", "DESC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return res.json({
      success: true,
      data: media,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Error fetching campaign media:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/media/{id}:
 *   get:
 *     summary: Get campaign media by ID
 *     tags: [Marketing Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Media ID
 *     responses:
 *       200:
 *         description: Campaign media details
 *       404:
 *         description: Campaign media not found
 */
export const getCampaignMediaById = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const media = await mediaRepo.findOne({
      where: { 
        id: Number(id),
        isDelete: false
      }
    });

    if (!media) {
      return res.status(404).json({
        success: false,
        message: "Campaign media not found"
      });
    }

    return res.json({
      success: true,
      data: media,
      message: 'Campaign media retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting campaign media:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/media/{id}:
 *   put:
 *     summary: Update campaign media
 *     tags: [Marketing Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Media ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mediaUrl:
 *                 type: string
 *               mediaType:
 *                 type: string
 *               mediaTitle:
 *                 type: string
 *               mediaDescription:
 *                 type: string
 *               mediaSize:
 *                 type: number
 *               mediaDuration:
 *                 type: number
 *               thumbnailUrl:
 *                 type: string
 *               altText:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Campaign media updated successfully
 *       404:
 *         description: Campaign media not found
 */
export const updateCampaignMedia = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const media = await mediaRepo.findOne({
      where: { 
        id: Number(id),
        isDelete: false
      }
    });

    if (!media) {
      return res.status(404).json({
        success: false,
        message: "Campaign media not found"
      });
    }

    // Update media fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && (media as any).hasOwnProperty(key)) {
        (media as any)[key] = updateData[key];
      }
    });

    media.updatedAt = new Date();
    const savedMedia = await mediaRepo.save(media);

    return res.json({
      success: true,
      data: savedMedia,
      message: 'Campaign media updated successfully'
    });

  } catch (error) {
    console.error('Error updating campaign media:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/marketing/media/{id}:
 *   delete:
 *     summary: Soft delete campaign media
 *     tags: [Marketing Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Media ID
 *     responses:
 *       200:
 *         description: Campaign media deleted successfully
 *       404:
 *         description: Campaign media not found
 */
export const deleteCampaignMedia = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const media = await mediaRepo.findOne({
      where: { 
        id: Number(id),
        isDelete: false
      }
    });

    if (!media) {
      return res.status(404).json({
        success: false,
        message: "Campaign media not found"
      });
    }

    media.isDelete = true;
    media.updatedAt = new Date();
    await mediaRepo.save(media);

    return res.json({
      success: true,
      message: 'Campaign media deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting campaign media:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
