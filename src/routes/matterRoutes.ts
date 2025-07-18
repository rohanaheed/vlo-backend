import { Router } from 'express';
import { createMatter, getAllMatters, getMatterById, updateMatter, deleteMatter } from '../controllers/matterController';
import { authorize } from '../middleware/auth';
import { asyncHandler } from "../middleware/asyncHandler";
import { matterSchema, updateMatterSchema } from "../utils/validators/inputValidator";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

// All routes require authentication
router.use(authorize());

// Create Matter
router.post("/", authorize(["super_admin"]), validateRequest(matterSchema), asyncHandler(createMatter));

// Get all Matters (paginated)
router.get('/', authorize(["super_admin"]), asyncHandler(getAllMatters));

// Get Matter by ID
router.get('/:id', authorize(["super_admin"]), asyncHandler(getMatterById));

// Update Matter by ID
router.put('/:id', authorize(["super_admin"]), validateRequest(updateMatterSchema), asyncHandler(updateMatter));

// Soft delete Matter by ID
router.delete('/:id', authorize(["super_admin"]), asyncHandler(deleteMatter));

export default router; 