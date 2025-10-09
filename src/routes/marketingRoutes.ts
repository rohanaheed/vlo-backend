import { Router } from "express";
import {
  createCampaign,
  getAllCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  getCampaignStats,
  getCampaignPerformance
} from "../controllers/marketingCampaignController";
import {
  createEmailPerformance,
  getEmailPerformance,
  createSocialMediaPerformance,
  getSocialMediaPerformance,
  createSMSPerformance,
  getSMSPerformance,
  createGoogleAdsPerformance,
  getGoogleAdsPerformance
} from "../controllers/marketingPerformanceController";
import {
  createLead,
  getAllLeads,
  getLeadById,
  updateLead,
  deleteLead,
  getLeadStats,
  convertLead
} from "../controllers/marketingLeadController";
import {
  createCampaignChannel,
  getAllCampaignChannels,
  getCampaignChannelById,
  updateCampaignChannel,
  deleteCampaignChannel
} from "../controllers/marketingChannelController";
import {
  createCampaignMedia,
  getAllCampaignMedia,
  getCampaignMediaById,
  updateCampaignMedia,
  deleteCampaignMedia
} from "../controllers/marketingMediaController";
import {
  bulkCreateCampaigns,
  bulkUpdateCampaigns,
  bulkDeleteCampaigns,
  bulkCreateLeads,
  bulkUpdateLeads
} from "../controllers/marketingBulkController";
import {
  getDashboardOverview,
  getPerformanceAnalytics,
  getRevenueAnalytics
} from "../controllers/marketingDashboardController";
import { authorize } from "../middleware/auth";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Marketing
 *   description: Marketing campaign management endpoints
 */

// Campaign routes
router.post("/campaigns", authorize(), createCampaign);
router.get("/campaigns", authorize(), getAllCampaigns);
router.get("/campaigns/stats", authorize(), getCampaignStats);
router.get("/campaigns/:id", authorize(), getCampaignById);
router.put("/campaigns/:id", authorize(), updateCampaign);
router.delete("/campaigns/:id", authorize(), deleteCampaign);
router.get("/campaigns/:id/performance", authorize(), getCampaignPerformance);

// Performance tracking routes
router.post("/performance/email", authorize(), createEmailPerformance);
router.get("/performance/email", authorize(), getEmailPerformance);
router.post("/performance/social", authorize(), createSocialMediaPerformance);
router.get("/performance/social", authorize(), getSocialMediaPerformance);
router.post("/performance/sms", authorize(), createSMSPerformance);
router.get("/performance/sms", authorize(), getSMSPerformance);
router.post("/performance/google-ads", authorize(), createGoogleAdsPerformance);
router.get("/performance/google-ads", authorize(), getGoogleAdsPerformance);

// Lead management routes
router.post("/leads", authorize(), createLead);
router.get("/leads", authorize(), getAllLeads);
router.get("/leads/stats", authorize(), getLeadStats);
router.get("/leads/:id", authorize(), getLeadById);
router.put("/leads/:id", authorize(), updateLead);
router.delete("/leads/:id", authorize(), deleteLead);
router.post("/leads/convert/:id", authorize(), convertLead);

// Campaign channel routes
router.post("/channels", authorize(), createCampaignChannel);
router.get("/channels", authorize(), getAllCampaignChannels);
router.get("/channels/:id", authorize(), getCampaignChannelById);
router.put("/channels/:id", authorize(), updateCampaignChannel);
router.delete("/channels/:id", authorize(), deleteCampaignChannel);

// Campaign media routes
router.post("/media", authorize(), createCampaignMedia);
router.get("/media", authorize(), getAllCampaignMedia);
router.get("/media/:id", authorize(), getCampaignMediaById);
router.put("/media/:id", authorize(), updateCampaignMedia);
router.delete("/media/:id", authorize(), deleteCampaignMedia);

// Bulk operations routes
router.post("/campaigns/bulk", authorize(), bulkCreateCampaigns);
router.put("/campaigns/bulk", authorize(), bulkUpdateCampaigns);
router.delete("/campaigns/bulk", authorize(), bulkDeleteCampaigns);
router.post("/leads/bulk", authorize(), bulkCreateLeads);
router.put("/leads/bulk", authorize(), bulkUpdateLeads);

// Dashboard routes
router.get("/dashboard/overview", authorize(), getDashboardOverview);
router.get("/dashboard/performance", authorize(), getPerformanceAnalytics);
router.get("/dashboard/revenue", authorize(), getRevenueAnalytics);

export default router;
