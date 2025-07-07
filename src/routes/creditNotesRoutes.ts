import { Router } from "express";
import { 
  createCreditNote, 
  getAllCreditNotes, 
  getCreditNoteById, 
  updateCreditNote, 
  deleteCreditNote, 
  getCreditNoteStats,
  getCreditNotesByCustomer
} from "../controllers/creditNotesController";
import { authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { creditNoteSchema, updateCreditNoteSchema } from "../utils/validators/inputValidator";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

// Create new credit note
router.post("/", authorize(["super_admin", "user"]), validateRequest(creditNoteSchema), asyncHandler(createCreditNote));

// Get all credit notes (paginated with filters)
router.get("/", authorize(["super_admin", "user"]), asyncHandler(getAllCreditNotes));

// Get credit note statistics
router.get("/stats", authorize(["super_admin", "user"]), asyncHandler(getCreditNoteStats));

// Get credit notes by customer ID
router.get("/customer/:customerId", authorize(["super_admin", "user"]), asyncHandler(getCreditNotesByCustomer));

// Get credit note by ID
router.get("/:id", authorize(["super_admin", "user"]), asyncHandler(getCreditNoteById));

// Update credit note
router.put("/:id", authorize(["super_admin", "user"]), validateRequest(updateCreditNoteSchema), asyncHandler(updateCreditNote));

// Delete credit note (soft delete)
router.delete("/:id", authorize(["super_admin", "user"]), asyncHandler(deleteCreditNote));

export default router; 