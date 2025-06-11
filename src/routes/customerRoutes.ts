import { Router } from "express";
import { createCustomer, getCustomerStats, getAllCustomers } from "../controllers/customerController";
import { authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { customerSchema } from "../utils/validators/inputValidator";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.post("/", validateRequest(customerSchema), asyncHandler(createCustomer));

router.get("/stats", asyncHandler(getCustomerStats));

router.get("/", asyncHandler(getAllCustomers));

export default router;
