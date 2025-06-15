import { Router } from "express";
import { createSubscription, getSubscriptions } from "../controllers/subscriptionController";
import { authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { validateRequest } from "../middleware/validateRequest";
import { subscriptionSchema } from "../utils/validators/inputValidator";

const router = Router();

router.post("/", authorize(["super_admin"]), validateRequest(subscriptionSchema), asyncHandler(createSubscription));
router.get("/list", authorize(["super_admin"]), asyncHandler(getSubscriptions));

export default router;