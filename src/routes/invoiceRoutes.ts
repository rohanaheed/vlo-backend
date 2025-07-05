import { Router } from "express";
import { 
  createInvoice, 
  getAllInvoices, 
  getInvoiceById, 
  updateInvoice, 
  deleteInvoice, 
  getInvoiceStats,
  getInvoicesByCustomer
} from "../controllers/invoiceController";
import { authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { invoiceSchema, updateInvoiceSchema } from "../utils/validators/inputValidator";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

// Create new invoice
router.post("/", authorize(["super_admin", "user"]), validateRequest(invoiceSchema), asyncHandler(createInvoice));

// Get all invoices (paginated with filters)
router.get("/", authorize(["super_admin", "user"]), asyncHandler(getAllInvoices));

// Get invoice statistics
router.get("/stats", authorize(["super_admin", "user"]), asyncHandler(getInvoiceStats));

// Get invoices by customer ID
router.get("/customer/:customerId", authorize(["super_admin", "user"]), asyncHandler(getInvoicesByCustomer));

// Get invoice by ID
router.get("/:id", authorize(["super_admin", "user"]), asyncHandler(getInvoiceById));

// Update invoice
router.put("/:id", authorize(["super_admin", "user"]), validateRequest(updateInvoiceSchema), asyncHandler(updateInvoice));

// Delete invoice (soft delete)
router.delete("/:id", authorize(["super_admin", "user"]), asyncHandler(deleteInvoice));

export default router; 