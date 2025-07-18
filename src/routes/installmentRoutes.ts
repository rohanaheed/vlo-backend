import { Router } from 'express';
import { createInstallment, getAllInstallments, getInstallmentById, updateInstallment, deleteInstallment } from '../controllers/installmentController';
import { authorize } from '../middleware/auth';
import { asyncHandler } from "../middleware/asyncHandler";
import { installmentSchema, updateInstallmentSchema } from "../utils/validators/inputValidator";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

// All routes require authentication
router.use(authorize());

// Create Matter
router.post("/", authorize(["super_admin"]), validateRequest(installmentSchema), asyncHandler(createInstallment));

// Get all Matters (paginated)
router.get('/', authorize(["super_admin"]), asyncHandler(getAllInstallments));

// Get Matter by ID
router.get('/:id', authorize(["super_admin"]), asyncHandler(getInstallmentById));

// Update Matter by ID
router.put('/:id', authorize(["super_admin"]), validateRequest(updateInstallmentSchema), asyncHandler(updateInstallment));

// Soft delete Matter by ID
router.delete('/:id', authorize(["super_admin"]), asyncHandler(deleteInstallment));

export default router; 