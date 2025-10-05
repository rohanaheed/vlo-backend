import express from "express";
import {
  getAllHeadsUp,
  getHeadsUpById,
  createHeadsUp,
  updateHeadsUp,
  deleteHeadsUp,
  toggleHeadsUpStatus,
  enableHeadsUp,
  disableHeadsUp,
} from "../controllers/headsUpController";
import { authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { headsUpSchema, updateHeadsUpSchema } from "../utils/validators/inputValidator";
import { validateRequest } from "../middleware/validateRequest";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: HeadsUp
 *   description: Heads-up notification management
 */

// Apply authentication middleware to all routes
router.use(authorize(["super_admin"]));

// GET /api/heads-up - Get all heads-up notifications
router.get("/", authorize(["super_admin"]), asyncHandler(getAllHeadsUp));

// GET /api/heads-up/:id - Get heads-up notification by ID
router.get("/:id", authorize(["super_admin"]), asyncHandler(getHeadsUpById));

// POST /api/heads-up - Create new heads-up notification
router.post("/", authorize(["super_admin"]), validateRequest(headsUpSchema), asyncHandler(createHeadsUp));

// PUT /api/heads-up/:id - Update heads-up notification
router.put("/:id", authorize(["super_admin"]), validateRequest(updateHeadsUpSchema), asyncHandler(updateHeadsUp));

// DELETE /api/heads-up/:id - Delete heads-up notification (soft delete)
router.delete("/:id", authorize(["super_admin"]), asyncHandler(deleteHeadsUp));

// PATCH /api/heads-up/:id/toggle-status - Toggle heads-up notification status
router.patch("/:id/toggle-status", authorize(["super_admin"]), asyncHandler(toggleHeadsUpStatus));

// PATCH /api/heads-up/:id/enable - Enable heads-up notification
router.patch("/:id/enable", authorize(["super_admin"]), asyncHandler(enableHeadsUp));

// PATCH /api/heads-up/:id/disable - Disable heads-up notification
router.patch("/:id/disable", authorize(["super_admin"]), asyncHandler(disableHeadsUp));

export default router;
