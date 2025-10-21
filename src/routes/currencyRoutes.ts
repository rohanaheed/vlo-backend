import { Router } from 'express';
import {
  createCurrency,
  getAllCurrencies,
  getCurrencyById,
  updateCurrency,
  deleteCurrency,
  bulkCreateCurrencies
} from '../controllers/currencyController';
import { validateRequest } from '../middleware/validateRequest';
import { currencySchema, updateCurrencySchema } from '../utils/validators/inputValidator';
import { authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Currencies
 *   description: Currency management endpoints
 */

// All routes require authentication
router.use(authorize());

// Create a new currency
router.post(
  '/',
  authorize(['super_admin']),
  validateRequest(currencySchema),
  asyncHandler(createCurrency)
);

// Get all currencies (paginated)
router.get(
  '/',
  authorize(['super_admin']),
  asyncHandler(getAllCurrencies)
);

// Get currency by ID
router.get(
  '/:id',
  authorize(['super_admin']),
  asyncHandler(getCurrencyById)
);

// Update currency by ID
router.put(
  '/:id',
  authorize(['super_admin']),
  validateRequest(updateCurrencySchema),
  asyncHandler(updateCurrency)
);

// Delete currency by ID (soft delete)
router.delete(
  '/:id',
  authorize(['super_admin']),
  asyncHandler(deleteCurrency)
);

// Bulk create currencies
router.post(
  '/bulk',
  authorize(['super_admin']),
  asyncHandler(bulkCreateCurrencies)
);

export default router;
