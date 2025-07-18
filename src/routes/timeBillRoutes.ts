import { Router } from 'express';
import { createTimeBill, updateTimeBill, getAllTimeBills, getTimeBillById, deleteTimeBill, bulkDeleteTimeBills } from '../controllers/timeBillController';
import { authorize } from '../middleware/auth';
import { asyncHandler } from "../middleware/asyncHandler";
import { timeBillSchema, updateTimeBillSchema } from "../utils/validators/inputValidator";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

// All routes require authentication
router.use(authorize());

// Create TimeBill
router.post("/", authorize(["super_admin"]), validateRequest(timeBillSchema), asyncHandler(createTimeBill));

// Bulk delete time bills
router.post("/bulk-delete", authorize(["super_admin"]), asyncHandler(bulkDeleteTimeBills));

// Get all time Bills (paginated)
router.get('/', authorize(["super_admin"]), asyncHandler(getAllTimeBills));

// Get time bill by ID
router.get('/:id', authorize(["super_admin"]), asyncHandler(getTimeBillById));

// Update time bill by ID
router.put('/:id', authorize(["super_admin"]), validateRequest(updateTimeBillSchema), asyncHandler(updateTimeBill));

// Soft delete timebill by ID
router.delete('/:id', authorize(["super_admin"]), asyncHandler(deleteTimeBill));

export default router;