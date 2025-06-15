import { Router } from "express";
import { createCustomer, getCustomerStats, getAllCustomers, updateCustomer } from "../controllers/customerController";
import { authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { customerSchema } from "../utils/validators/inputValidator";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.post("/", authorize(["super_admin"]), validateRequest(customerSchema), asyncHandler(createCustomer));

router.put("/:id", authorize(["super_admin"]), validateRequest(customerSchema), asyncHandler(updateCustomer));

router.get("/stats", authorize(["super_admin"]), asyncHandler(getCustomerStats));

router.get("/", authorize(["super_admin"]), asyncHandler(getAllCustomers));

export default router;
