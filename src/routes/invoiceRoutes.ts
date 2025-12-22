import { Router } from "express";
import { 
  createInvoice, 
  getAllInvoices, 
  getInvoiceById, 
  updateInvoice, 
  deleteInvoice, 
  getInvoiceStats,
  getInvoicesByCustomer,
  markInvoiceAsBad,
  getVatStats,
  sendInvoice,
  downloadInvoicePDF,
  cancelInvoice,
  getInvoiceForPayment
} from "../controllers/invoiceController";
import { authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { invoiceSchema, updateInvoiceSchema } from "../utils/validators/inputValidator";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

// Create new invoice
router.post("/", authorize(["super_admin",]), validateRequest(invoiceSchema), asyncHandler(createInvoice));

// Get all invoices (paginated with filters)
router.get("/", authorize(["super_admin"]), asyncHandler(getAllInvoices));

// Get invoice statistics
router.get("/stats", authorize(["super_admin"]), asyncHandler(getInvoiceStats));

// Get invoices by customer ID
router.get("/customer/:customerId", authorize(["super_admin"]), asyncHandler(getInvoicesByCustomer));

// Get invoice by ID
router.get("/:id", authorize(["super_admin"]), asyncHandler(getInvoiceById));

//get vat stats
router.get("/vat-stats", authorize(["super_admin"]), asyncHandler(getVatStats));

// Update invoice
router.put("/:id", authorize(["super_admin"]), validateRequest(updateInvoiceSchema), asyncHandler(updateInvoice));

router.put("/:id/mark-bad", authorize(["super_admin"]), asyncHandler(markInvoiceAsBad));

// Delete invoice (soft delete)
router.delete("/:id", authorize(["super_admin"]), asyncHandler(deleteInvoice));

// Fetch invoice details for payment
router.get("/details/:orderId", authorize(["super_admin", "user"]), asyncHandler(getInvoiceForPayment));

// Send Invoice
router.post("/:invoiceId/send-invoice/:customerId", authorize(["super_admin"]), asyncHandler(sendInvoice));

// Download Invoice
router.post("/:invoiceId/download-pdf/:customerId", authorize(["super_admin"]), asyncHandler(downloadInvoicePDF));

// Cancel Invoice
router.post("/cancel/:invoiceId", authorize(["super_admin"]), asyncHandler(cancelInvoice));

export default router; 