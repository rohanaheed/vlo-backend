import { Router } from 'express';
import {
  getActivationMetrics,
  getChurnPrediction,
  getFunnelConversion,
  getPlanDistribution,  
  getPreSignupMetrics,
  getRetentionPaymentMetrics,
  getSignupAbandonmentMetrics,
} from '../controllers/preSignupMatricController';
import { authorize } from '../middleware/auth';
import { asyncHandler } from "../middleware/asyncHandler";
// import { validateRequest } from "../middleware/validateRequest";

const router = Router();

// All routes require authentication
router.use(authorize());
// Get all Pre-signup Metrics (paginated)
router.get('/growth-percentage', authorize(["super_admin"]), asyncHandler(getPreSignupMetrics));

router.get('/signup-abandonment', authorize(["super_admin"]), asyncHandler(getSignupAbandonmentMetrics));

router.get('/activation', authorize(["super_admin"]), asyncHandler(getActivationMetrics));

router.get('/retention-payment', authorize(["super_admin"]), asyncHandler(getRetentionPaymentMetrics));

router.get('/plan-distribution', authorize(["super_admin"]), asyncHandler(getPlanDistribution));

router.get('/churn-prediction', authorize(["super_admin"]), asyncHandler(getChurnPrediction));

router.get('/funnel-conversion', authorize(["super_admin"]), asyncHandler(getFunnelConversion));

export default router; 