import { Router } from "express";
import { authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { handleStripeWebhook } from "../controllers/stripWebhookController";

const router = Router();

router.post("/webhook", authorize(["super_admin"]), asyncHandler(handleStripeWebhook));

export default router;