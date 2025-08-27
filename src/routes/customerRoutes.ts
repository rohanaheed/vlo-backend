import { Router } from "express";
import { createCustomer, getCustomerStats, getAllCustomers, updateCustomer, getCustomerById, sendRegistrationEmail, getDeletedCustomers } from "../controllers/customerController";
import { authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { customerSchema, registrationEmailSchema } from "../utils/validators/inputValidator";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.post("/", authorize(["super_admin"]), validateRequest(customerSchema), asyncHandler(createCustomer));

router.put("/:id", authorize(["super_admin"]), validateRequest(customerSchema), asyncHandler(updateCustomer));

router.get("/stats", authorize(["super_admin"]), asyncHandler(getCustomerStats));

router.get("/", authorize(["super_admin"]), asyncHandler(getAllCustomers));

// Get only deleted customers (must be before :id)
router.get("/deleted", authorize(["super_admin"]), asyncHandler(getDeletedCustomers));

// Get customer by ID
router.get("/:id", authorize(["super_admin", "user"]), asyncHandler(getCustomerById));

// Send registration email to customer
router.post("/:customerId/send-registration-email", authorize(["super_admin", "user"]), validateRequest(registrationEmailSchema), asyncHandler(sendRegistrationEmail));

export default router;
