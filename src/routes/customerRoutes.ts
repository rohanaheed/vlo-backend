import { Router } from "express";
import { createCustomer } from "../controllers/customerController";
import { authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { customerSchema } from "../utils/validators/inputValidator";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.post("/", validateRequest(customerSchema), asyncHandler(createCustomer));

export default router;
