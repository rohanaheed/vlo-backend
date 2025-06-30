import { Router } from "express";
import { authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { validateRequest } from "../middleware/validateRequest";
import { handleStripeWebhook, createPaymentIntent } from "../controllers/stripWebhookController";
import {
  createPayment,
  getCustomerPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
  setDefaultPayment,
  getDefaultPayment
} from "../controllers/paymentController";
import { paymentSchema, updatePaymentSchema } from "../utils/validators/inputValidator";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Stripe
 *   description: Stripe payment and webhook endpoints
 */

/**
 * @swagger
 * /api/stripe/webhook:
 *   post:
 *     summary: Handle Stripe webhook events
 *     tags: [Stripe]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Stripe event payload (raw body)
 *     responses:
 *       200:
 *         description: Webhook received and processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: boolean
 *       400:
 *         description: Invalid signature or event
 */

/**
 * @swagger
 * /api/stripe/intent:
 *   post:
 *     summary: Create a Stripe payment intent
 *     tags: [Stripe]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - customerId
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to charge (in major currency units, e.g. dollars)
 *               currency:
 *                 type: string
 *                 default: usd
 *               customerId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment intent created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clientSecret:
 *                   type: string
 *       500:
 *         description: Failed to create payment intent
 */

// Existing Stripe webhook routes
router.post("/webhook", authorize(["super_admin"]), asyncHandler(handleStripeWebhook));
router.post("/intent", authorize(["super_admin"]), asyncHandler(createPaymentIntent));

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