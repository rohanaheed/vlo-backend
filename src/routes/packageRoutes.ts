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
  getPackagesByBillingCycle,
  createPackageModule,
  deletePackageModule,
  getAllPackageModules,
  getPackageModuleById,
  updatePackageModule,
  getPackagesForCustomer,
  getAddOnsForSelectedPackage,
  getCustomerSelectedPackage
} from "../controllers/packageController";
import { validateRequest } from "../middleware/validateRequest";
import { packageSchema, updatePackageSchema, createPackageModuleSchema, updatePackageModuleSchema } from "../utils/validators/inputValidator";
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
  validateRequest(updatePackageSchema),
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

// Get packages for customer
router.get("/list/:customerId", authorize(["super_admin", "user"]), asyncHandler(getPackagesForCustomer));

// Get customer selected package info
router.get("/customer-package/:customerId", authorize(["super_admin", "user"]), asyncHandler(getCustomerSelectedPackage));

// Get packages extra addons for customer
router.get("/addons/:customerId", authorize(["super_admin", "user"]), asyncHandler(getAddOnsForSelectedPackage));

// Package Module Routes

// Create a new package module
router.post(
  "/module",
  authorize(["super_admin"]),
  validateRequest(createPackageModuleSchema),
  asyncHandler(createPackageModule)
);

// Get all package modules
router.get(
  "/module",
  authorize(["super_admin"]),
  asyncHandler(getAllPackageModules)
);

// Get a package module by ID
router.get(
  "/module/:id",
  authorize(["super_admin"]),
  asyncHandler(getPackageModuleById)
);

// Update a package module
router.put(
  "/module/:id",
  authorize(["super_admin"]),
  validateRequest(updatePackageModuleSchema),
  asyncHandler(updatePackageModule)
);

// Delete a package module
router.delete(
  "/module/:id",
  authorize(["super_admin"]),
  asyncHandler(deletePackageModule)
);


export default router; 