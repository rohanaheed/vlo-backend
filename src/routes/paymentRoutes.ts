import { Router } from "express";
import { authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { validateRequest } from "../middleware/validateRequest";
import { handleStripeWebhook } from "../controllers/stripWebhookController";
import {
  createPayment,
  getCustomerPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
  setDefaultPayment,
  getDefaultPayment
} from "../controllers/paymentMethodController";
import { paymentSchema, updatePaymentSchema } from "../utils/validators/inputValidator";

const router = Router();
// Existing Stripe webhook routes
router.post("/webhook", authorize(["super_admin"]), asyncHandler(handleStripeWebhook));
// router.post("/intent", authorize(["super_admin"]), asyncHandler(createPaymentIntent));

// Payment method CRUD routes
router.post("/methods", authorize(["super_admin", "user"]), validateRequest(paymentSchema), asyncHandler(createPayment));

router.get("/methods/customer/:customerId", authorize(["super_admin", "user"]), asyncHandler(getCustomerPayments));

router.get("/methods/:id", authorize(["super_admin", "user"]), asyncHandler(getPaymentById));

router.put("/methods/:id", authorize(["super_admin", "user"]), validateRequest(updatePaymentSchema), asyncHandler(updatePayment));

router.delete("/methods/:id", authorize(["super_admin", "user"]), asyncHandler(deletePayment));

// Default payment method routes
router.patch("/methods/:id/set-default", authorize(["super_admin", "user"]), asyncHandler(setDefaultPayment));

router.get("/methods/customer/:customerId/default", authorize(["super_admin", "user"]), asyncHandler(getDefaultPayment));

export default router;