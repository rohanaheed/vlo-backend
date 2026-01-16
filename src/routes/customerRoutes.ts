import { Router } from "express";
import {
  createCustomer,
  getAllCustomers,
  updateCustomer,
  getCustomerById,
  sendRegistrationEmail,
  getDeletedCustomers,
  getActiveCustomersPerYear,
  getTotalCustomersPerYear,
  getRevenueTrend,
  sendVerificationCode,
  verifyEmailCode,
  checkCustomerExist,
  selectCustomerPackage,
  selectCustomerAddOns,
  getCustomerOrderSummary,
  getCustomerDashboardStats,
  deleteCustomer,
  isCustomerVerified
} from "../controllers/customerController";
import { authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { customerSchema, registrationEmailSchema, sendCodeSchema, updateCustomerSchema, verifyOTPSchema } from "../utils/validators/inputValidator";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.post("/", authorize(["super_admin"]), validateRequest(customerSchema), asyncHandler(createCustomer));

// Send Email Verification Code to Customer
router.post("/send-email-verification-code", authorize(["super_admin", "user"]), validateRequest(sendCodeSchema), asyncHandler(sendVerificationCode));

// Verify Email Code
router.post("/verify-verification-code", authorize(["super_admin", "user"]), validateRequest(verifyOTPSchema), asyncHandler(verifyEmailCode));

// Is Email or Phone Verified
router.post("/is-verified", authorize(["super_admin", "user"]), asyncHandler(isCustomerVerified));

// Get active customers per year
router.get("/active-per-year", authorize(["super_admin"]), asyncHandler(getActiveCustomersPerYear));

// Get total customers per year
router.get("/total-per-year", authorize(["super_admin"]), asyncHandler(getTotalCustomersPerYear));

// Get revenue trend per year
router.get("/revenue-trend", authorize(["super_admin"]), asyncHandler(getRevenueTrend));

// Update customer by ID
router.put("/:id", authorize(["super_admin"]), validateRequest(updateCustomerSchema), asyncHandler(updateCustomer));

// Get customer dashboard stats
router.get("/stats", authorize(["super_admin"]), asyncHandler(getCustomerDashboardStats));

// Get all customers
router.get("/all-customers", authorize(["super_admin"]), asyncHandler(getAllCustomers));

// Delete Customer
router.delete("/:id", authorize(["super_admin"]), asyncHandler(deleteCustomer));

// Get only deleted customers (must be before :id)
router.get("/deleted", authorize(["super_admin"]), asyncHandler(getDeletedCustomers));

// Get customer by ID
router.get("/:id", authorize(["super_admin", "user"]), asyncHandler(getCustomerById));

// Send registration email to customer
router.post("/:customerId/send-registration-email", authorize(["super_admin", "user"]), validateRequest(registrationEmailSchema), asyncHandler(sendRegistrationEmail));

router.post("/check-email", authorize(["super_admin", "user"]), asyncHandler(checkCustomerExist));

// Select Package
router.put("/:customerId/select-package", authorize(["super_admin", "user"]), asyncHandler(selectCustomerPackage));

// Select Add-Ons for Customer's Package
router.post("/:customerId/select-package/:packageId/add-ons", authorize(["super_admin", "user"]), asyncHandler(selectCustomerAddOns));

router.get("/order-summary/:customerId", authorize(["super_admin", "user"]), asyncHandler(getCustomerOrderSummary));

export default router;
