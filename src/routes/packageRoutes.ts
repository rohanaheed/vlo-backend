import { Router } from "express";
import {
  createPackage,
  getAllPackages,
  getPackageById,
  updatePackage,
  deletePackage,
  getActivePackages,
  getFreePackages,
  getPaidPackages,
  getPackagesByBillingCycle
} from "../controllers/packageController";
import { validateRequest } from "../middleware/validateRequest";
import { packageSchema } from "../utils/validators/inputValidator";
import { authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

// Create a new package
router.post(
  "/",
  authorize(["super_admin"]),
  validateRequest(packageSchema),
  asyncHandler(createPackage)
);

// Get all packages
router.get("/", authorize(["super_admin"]), asyncHandler(getAllPackages));

// Get package by ID
router.get("/:id", authorize(["super_admin"]), asyncHandler(getPackageById));

// Update package
router.put(
  "/:id",
  authorize(["super_admin"]),
  validateRequest(packageSchema),
  asyncHandler(updatePackage)
);

// Delete package (soft delete)
router.delete("/:id", authorize(["super_admin"]), asyncHandler(deletePackage));

// Get active packages only
router.get("/active/list", authorize(["super_admin", "user"]), asyncHandler(getActivePackages));

// Get free packages
router.get("/free/list", authorize(["super_admin", "user"]), asyncHandler(getFreePackages));

// Get paid packages
router.get("/paid/list", authorize(["super_admin", "user"]), asyncHandler(getPaidPackages));

// Get packages by billing cycle
router.get("/billing-cycle/:cycle", authorize(["super_admin", "user"]), asyncHandler(getPackagesByBillingCycle));

export default router; 