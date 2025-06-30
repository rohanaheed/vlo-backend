import { Router } from "express";
import {
  createBusinessType,
  getAllBusinessTypes,
  getBusinessTypeById,
  updateBusinessType,
  deleteBusinessType,
  createBusinessEntity,
  getAllBusinessEntities,
  getBusinessEntityById,
  updateBusinessEntity,
  deleteBusinessEntity,
  createPracticeArea,
  getAllPracticeAreas,
  getPracticeAreaById,
  updatePracticeArea,
  deletePracticeArea
} from "../controllers/businessController";
import { validateRequest } from "../middleware/validateRequest";
import { businessTypeSchema, businessEntitySchema, businessPracticeAreaSchema } from "../utils/validators/inputValidator";
import { authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: BusinessType
 *   description: Business Type management
 */
/**
 * @swagger
 * /api/business/type/:
 *   post:
 *     summary: Create a new business type
 *     tags: [BusinessType]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: BusinessType created
 *       409:
 *         description: BusinessType already exists
 */
router.post(
  "/type/",
  authorize(["super_admin"]),
  validateRequest(businessTypeSchema),
  asyncHandler(createBusinessType)
);

/**
 * @swagger
 * /api/business/type/:
 *   get:
 *     summary: Get all business types
 *     tags: [BusinessType]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of business types
 */
router.get("/type/", authorize(["super_admin"]), asyncHandler(getAllBusinessTypes));

/**
 * @swagger
 * /api/business/type/{id}:
 *   get:
 *     summary: Get business type by ID
 *     tags: [BusinessType]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: BusinessType ID
 *     responses:
 *       200:
 *         description: BusinessType found
 *       404:
 *         description: BusinessType not found
 */
router.get("/type/:id", authorize(["super_admin"]), asyncHandler(getBusinessTypeById));

/**
 * @swagger
 * /api/business/type/{id}:
 *   put:
 *     summary: Update business type
 *     tags: [BusinessType]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: BusinessType ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: BusinessType updated
 *       404:
 *         description: BusinessType not found
 */
router.put(
  "/type/:id",
  authorize(["super_admin"]),
  validateRequest(businessTypeSchema),
  asyncHandler(updateBusinessType)
);

/**
 * @swagger
 * /api/business/type/{id}:
 *   delete:
 *     summary: Soft delete business type
 *     tags: [BusinessType]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: BusinessType ID
 *     responses:
 *       200:
 *         description: BusinessType soft deleted
 *       404:
 *         description: BusinessType not found
 */
router.delete(
  "/type/:id",
  authorize(["super_admin"]),
  asyncHandler(deleteBusinessType)
);

/**
 * Routes for business entity
 * 
 * */

/**
 * @swagger
 * tags:
 *   name: BusinessEntity
 *   description: Business Entity management
 */
/**
 * @swagger
 * /api/business/entity/:
 *   post:
 *     summary: Create a new business entity
 *     tags: [BusinessEntity]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: BusinessEntity created
 *       409:
 *         description: BusinessEntity already exists
 */
router.post(
  "/entity/",
  authorize(["super_admin"]),
  validateRequest(businessEntitySchema),
  asyncHandler(createBusinessEntity)
);

/**
 * @swagger
 * /api/business/entity/:
 *   get:
 *     summary: Get all business entities
 *     tags: [BusinessEntity]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of business entities
 */
router.get("/entity/", authorize(["super_admin"]), asyncHandler(getAllBusinessEntities));

/**
 * @swagger
 * /api/business/entity/{id}:
 *   get:
 *     summary: Get business entity by ID
 *     tags: [BusinessEntity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: BusinessEntity ID
 *     responses:
 *       200:
 *         description: BusinessEntity found
 *       404:
 *         description: BusinessEntity not found
 */
router.get("/entity/:id", authorize(["super_admin"]), asyncHandler(getBusinessEntityById));

/**
 * @swagger
 * /api/business/entity/{id}:
 *   put:
 *     summary: Update business entity
 *     tags: [BusinessEntity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: BusinessEntity ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: BusinessEntity updated
 *       404:
 *         description: BusinessEntity not found
 */
router.put(
  "/entity/:id",
  authorize(["super_admin"]),
  validateRequest(businessEntitySchema),
  asyncHandler(updateBusinessEntity)
);

/**
 * @swagger
 * /api/business/entity/{id}:
 *   delete:
 *     summary: Soft delete business entity
 *     tags: [BusinessEntity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: BusinessEntity ID
 *     responses:
 *       200:
 *         description: BusinessEntity soft deleted
 *       404:
 *         description: BusinessEntity not found
 */
router.delete(
  "/entity/:id",
  authorize(["super_admin"]),
  asyncHandler(deleteBusinessEntity)
);

/**
 * Routes for business practice areas
 * 
 * */

/**
 * @swagger
 * tags:
 *   name: BusinessPracticeArea
 *   description: Business Practice Area management
 */
/**
 * @swagger
 * /api/business/area/:
 *   post:
 *     summary: Create a new business practice area
 *     tags: [BusinessPracticeArea]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: BusinessPracticeArea created
 *       409:
 *         description: Already exists
 */
router.post(
  "/area/",
  authorize(["super_admin"]),
  validateRequest(businessPracticeAreaSchema),
  asyncHandler(createPracticeArea)
);

/**
 * @swagger
 * /api/business/area/:
 *   get:
 *     summary: Get all business practice areas
 *     tags: [BusinessPracticeArea]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of business practice areas
 */
router.get("/area/", authorize(["super_admin"]), asyncHandler(getAllPracticeAreas));

/**
 * @swagger
 * /api/business/area/{id}:
 *   get:
 *     summary: Get business practice area by ID
 *     tags: [BusinessPracticeArea]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: BusinessPracticeArea ID
 *     responses:
 *       200:
 *         description: BusinessPracticeArea found
 *       404:
 *         description: Not found
 */
router.get("/area/:id", authorize(["super_admin"]), asyncHandler(getPracticeAreaById));

/**
 * @swagger
 * /api/business/area/{id}:
 *   put:
 *     summary: Update business practice area
 *     tags: [BusinessPracticeArea]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: BusinessPracticeArea ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: BusinessPracticeArea updated
 *       404:
 *         description: Not found
 */
router.put(
  "/area/:id",
  authorize(["super_admin"]),
  validateRequest(businessPracticeAreaSchema),
  asyncHandler(updatePracticeArea)
);

/**
 * @swagger
 * /api/business/area/{id}:
 *   delete:
 *     summary: Soft delete business practice area
 *     tags: [BusinessPracticeArea]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: BusinessPracticeArea ID
 *     responses:
 *       200:
 *         description: BusinessPracticeArea soft deleted
 *       404:
 *         description: Business practice area not found
 */
router.delete(
  "/area/:id",
  authorize(["super_admin"]),
  asyncHandler(deletePracticeArea)
);


export default router;