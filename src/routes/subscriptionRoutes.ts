import { Router } from "express";
import {
  createSubscription,
  updateSubscription,
  deleteSubscription,
  getAllSubscriptions,
  getSubscriptionById,
  updateAutoRenew,
  cancelSubscription
} from "../controllers/subscriptionController";
import { validateRequest } from "../middleware/validateRequest";
import { createSubscriptionSchema, updateSubscriptionSchema } from "../utils/validators/inputValidator";
import { authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

// Create a new subscription
router.post(
  "/",
  authorize(["super_admin"]),
  validateRequest(createSubscriptionSchema),
  asyncHandler(createSubscription)
);

// Get all subscription
router.get("/", authorize(["super_admin"]), asyncHandler(getAllSubscriptions));

// Get subscription by ID
router.get("/:id", authorize(["super_admin"]), asyncHandler(getSubscriptionById));

// Update subscription
router.put(
  "/:id",
  authorize(["super_admin"]),
  validateRequest(updateSubscriptionSchema),
  asyncHandler(updateSubscription)
);

// Delete subscription (soft delete)
router.delete("/:id", authorize(["super_admin"]), asyncHandler(deleteSubscription));

// Enable/disable auto-renew for subscription
router.patch("/:id/auto-renew", authorize(["super_admin"]), asyncHandler(updateAutoRenew));

// Cancel subscription (with option to cancel at period end or immediately)
router.post("/:id/cancel", authorize(["super_admin"]), asyncHandler(cancelSubscription));

export default router;