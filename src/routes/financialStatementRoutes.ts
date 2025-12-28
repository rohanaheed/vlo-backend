import { Router } from "express";
import { authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { validateRequest } from "../middleware/validateRequest";
import { financialStatementSchema, updateFinancialStatementSchema } from "../utils/validators/inputValidator";
import { createFinancialStatement, deleteDisbursementItem, deleteFinancialStatement, deleteOurCostItem, downloadFinancialStatementPDF, getAllStatements, getByCustomerId, getFinancialStatement, updateFinancialStatement } from "../controllers/financialController";

const router = Router();

// Create Financial Statement
router.post("/" , authorize(["super_admin"]), validateRequest(financialStatementSchema), asyncHandler(createFinancialStatement))

// Update Financial Statement
router.put("/:id", authorize(["super_admin"]), validateRequest(updateFinancialStatementSchema), asyncHandler(updateFinancialStatement))

// Get By Id
router.get("/:id", authorize(["super_admin"]), asyncHandler(getFinancialStatement))

// Get By Customer Id
router.get("/customer/:customerId", authorize(["super_admin"]), asyncHandler(getByCustomerId))

// Get All Financial Statements
router.get("/", authorize(["super_admin"]), asyncHandler(getAllStatements))

// Delete Financial Statement
router.delete("/:id", authorize(["super_admin"]), asyncHandler(deleteFinancialStatement))

// Delete Disbursement Item
router.delete("/:id/disbursements/:disbursementId", authorize(["super_admin"]), asyncHandler(deleteDisbursementItem))

// Delete Our Cost Item
router.delete("/:id/our-costs/:ourCostId", authorize(["super_admin"]), asyncHandler(deleteOurCostItem))

// Download Financial Statement
router.post("/download/:id", authorize(["super_admin"]), asyncHandler(downloadFinancialStatementPDF)) 

export default router
