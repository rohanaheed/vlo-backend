import { Router } from "express";
import { authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { handleStripeWebhook, createPaymentIntent } from "../controllers/stripWebhookController";

const router = Router();

router.post("/webhook", authorize(["super_admin"]), asyncHandler(handleStripeWebhook));
router.post("/intent", authorize(["super_admin"]), asyncHandler(createPaymentIntent));

export default router;