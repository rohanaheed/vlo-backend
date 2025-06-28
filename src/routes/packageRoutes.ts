import { Router } from "express";
import {
  createPackage,
  getAllPackages,
  getPackageById,
  updatePackage,
  deletePackage,
  getActivePackages,
  getDefaultPackage,
  getFreePackages,
  toggleAutoRenewal
} from "../controllers/packageController";
import { validateRequest } from "../middleware/validateRequest";
import { packageSchema, autoRenewalSchema } from "../utils/validators/inputValidator";
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

// Toggle auto-renewal for a package
router.patch(
  "/:id/auto-renewal",
  authorize(["super_admin"]),
  validateRequest(autoRenewalSchema),
  asyncHandler(toggleAutoRenewal)
);

// Get active packages only
router.get("/active/list", authorize(["super_admin", "user"]), asyncHandler(getActivePackages));

// Get default package
router.get("/default/package", authorize(["super_admin", "user"]), asyncHandler(getDefaultPackage));

// Get free packages
router.get("/free/list", authorize(["super_admin", "user"]), asyncHandler(getFreePackages));

export default router; 