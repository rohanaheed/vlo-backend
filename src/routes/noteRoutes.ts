import { Router } from "express";
import { 
  createNote, 
  getAllNotes, 
  getNoteById, 
  updateNote, 
  deleteNote, 
  getNotesByCustomer 
} from "../controllers/noteController";
import { authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { noteSchema, updateNoteSchema } from "../utils/validators/inputValidator";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

// Create a new note
router.post("/", authorize(["super_admin", "user"]), validateRequest(noteSchema), asyncHandler(createNote));

// Get all notes (paginated)
router.get("/", authorize(["super_admin", "user"]), asyncHandler(getAllNotes));

// Get note by ID
router.get("/:id", authorize(["super_admin", "user"]), asyncHandler(getNoteById));

// Update note by ID
router.put("/:id", authorize(["super_admin", "user"]), validateRequest(updateNoteSchema), asyncHandler(updateNote));

// Delete note by ID (soft delete)
router.delete("/:id", authorize(["super_admin", "user"]), asyncHandler(deleteNote));

// Get all notes for a specific customer
router.get("/customer/:customerId", authorize(["super_admin", "user"]), asyncHandler(getNotesByCustomer));

export default router; 