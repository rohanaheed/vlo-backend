import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { BusinessType } from "../entity/BusinessType";
import { BusinessEntity } from "../entity/BusniessEntity";
import {  BusinessPracticeArea } from "../entity/BusinessPracticeArea";

const businessEntityRepo = AppDataSource.getRepository(BusinessEntity);
const practiceRepo = AppDataSource.getRepository(BusinessPracticeArea);
const businessTypeRepo = AppDataSource.getRepository(BusinessType);

/**
 * @openapi
 * /api/business/types:
 *   post:
 *     summary: Create a new business type
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     description: This endpoint requires authentication. Provide a valid bearer token in the Authorization header.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Business type created successfully
 *       401:
 *         description: Unauthorized. Authentication required.
 *       409:
 *         description: BusinessType already exists
 */
export const createBusinessType = async (req: Request, res: Response): Promise<any> => {
  const { name } = req.body;
  const existing = await businessTypeRepo.findOneBy({ name });

  if (existing) {
    return res.status(409).json({ message: "BusinessType already exists" });
  }

  const newType = businessTypeRepo.create({ name, isDelete: false, createdAt: new Date(), updatedAt: new Date() });
  await businessTypeRepo.save(newType);

  return res.status(201).json(newType);
};

/**
 * @openapi
 * /api/business/types:
 *   get:
 *     summary: Get all business types
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of business types
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/BusinessType'
 */
export const getAllBusinessTypes = async (req: Request, res: Response): Promise<any> => {
  const types = await businessTypeRepo.find();
  return res.json(types);
};

/**
 * @openapi
 * /api/business/types/{id}:
 *   get:
 *     summary: Get business type by ID
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: BusinessType ID
 *     responses:
 *       200:
 *         description: Business type found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BusinessType'
 *       404:
 *         description: BusinessType not found
 */
export const getBusinessTypeById = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const type = await businessTypeRepo.findOneBy({ id: Number(id) });

  if (!type) {
    return res.status(404).json({ message: "BusinessType not found" });
  }

  return res.json(type);
};

/**
 * @openapi
 * /api/business/types/{id}:
 *   put:
 *     summary: Update business type
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: BusinessType ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Business type updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BusinessType'
 *       404:
 *         description: BusinessType not found
 */
export const updateBusinessType = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const { name } = req.body;

  const type = await businessTypeRepo.findOneBy({ id: Number(id) });

  if (!type) {
    return res.status(404).json({ message: "BusinessType not found" });
  }

  type.name = name;
  type.updatedAt = new Date();
  await businessTypeRepo.save(type);

  return res.json(type);
};

/**
 * @openapi
 * /api/business/types/{id}:
 *   delete:
 *     summary: Soft delete business type
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: BusinessType ID
 *     responses:
 *       200:
 *         description: BusinessType soft deleted successfully
 *       404:
 *         description: BusinessType not found
 */
export const deleteBusinessType = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  const businessType = await businessTypeRepo.findOne({ where: { id: Number(id) } });

  if (!businessType) {
    return res.status(404).json({ message: "BusinessType not found" });
  }

  // Set isDelete to true instead of actually deleting
  businessType.isDelete = true;
  await businessTypeRepo.save(businessType);

  return res.json({ message: "BusinessType soft deleted successfully" });
};

/**
 * @openapi
 * /api/business/entities:
 *   post:
 *     summary: Create a new business entity
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Business entity created successfully
 *       409:
 *         description: BusinessEntity already exists
 */
export const createBusinessEntity = async (req: Request, res: Response): Promise<any> => {
  const { name } = req.body;

  const existing = await businessEntityRepo.findOneBy({ name });
  if (existing) {
    return res.status(409).json({ message: "BusinessEntity already exists" });
  }

  const entity = businessEntityRepo.create({ name, isDelete: false, createdAt: new Date(), updatedAt: new Date() });
  await businessEntityRepo.save(entity);
  return res.status(201).json(entity);
};

/**
 * @openapi
 * /api/business/entities:
 *   get:
 *     summary: Get all business entities
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of business entities
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/BusinessEntity'
 */
export const getAllBusinessEntities = async (req: Request, res: Response): Promise<any> => {
  const entities = await businessEntityRepo.find();
  return res.json(entities);
};

/**
 * @openapi
 * /api/business/entities/{id}:
 *   get:
 *     summary: Get business entity by ID
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: BusinessEntity ID
 *     responses:
 *       200:
 *         description: Business entity found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BusinessEntity'
 *       404:
 *         description: BusinessEntity not found
 */
export const getBusinessEntityById = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const entity = await businessEntityRepo.findOneBy({ id: Number(id) });

  if (!entity) {
    return res.status(404).json({ message: "BusinessEntity not found" });
  }

  return res.json(entity);
};

/**
 * @openapi
 * /api/business/entities/{id}:
 *   put:
 *     summary: Update business entity
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: BusinessEntity ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Business entity updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BusinessEntity'
 *       404:
 *         description: BusinessEntity not found
 */
export const updateBusinessEntity = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const { name } = req.body;

  const entity = await businessEntityRepo.findOneBy({ id: Number(id) });
  if (!entity) {
    return res.status(404).json({ message: "BusinessEntity not found" });
  }

  entity.name = name;
  entity.updatedAt = new Date();
  await businessEntityRepo.save(entity);
  return res.json(entity);
};

/**
 * @openapi
 * /api/business/entities/{id}:
 *   delete:
 *     summary: Soft delete business entity
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: BusinessEntity ID
 *     responses:
 *       200:
 *         description: BusinessEntity soft deleted successfully
 *       404:
 *         description: BusinessEntity not found
 */
export const deleteBusinessEntity = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  const businessEntity = await businessEntityRepo.findOne({ where: { id: Number(id) } });

  if (!businessEntity) {
    return res.status(404).json({ message: "BusinessEntity not found" });
  }

  // Set isDelete to true instead of actually deleting
  businessEntity.isDelete = true;
  await businessEntityRepo.save(businessEntity);

  return res.json({ message: "BusinessEntity soft deleted successfully" });
};

/**
 * Routes for business practice areas
 * 
 *
 * 
 * 
 *  */

/**
 * @openapi
 * /api/business/practice-areas:
 *   post:
 *     summary: Create a new business practice area
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Business practice area created successfully
 *       409:
 *         description: Already exists
 */
export const createPracticeArea = async (req: Request, res: Response): Promise<any> => {
  const { name } = req.body;

  const existing = await practiceRepo.findOneBy({ name });
  if (existing) {
    return res.status(409).json({ message: "Already exists" });
  }

  const area = practiceRepo.create({ name, isDelete: false, createdAt: new Date(), updatedAt: new Date() });
  await practiceRepo.save(area);
  return res.status(201).json(area);
};

/**
 * @openapi
 * /api/business/practice-areas:
 *   get:
 *     summary: Get all business practice areas
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of business practice areas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/BusinessPracticeArea'
 */
export const getAllPracticeAreas = async (req: Request, res: Response): Promise<any> => {
  const areas = await practiceRepo.find();
  return res.json(areas);
};

/**
 * @openapi
 * /api/business/practice-areas/{id}:
 *   get:
 *     summary: Get business practice area by ID
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: BusinessPracticeArea ID
 *     responses:
 *       200:
 *         description: Business practice area found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BusinessPracticeArea'
 *       404:
 *         description: Not found
 */
export const getPracticeAreaById = async (req: Request, res: Response): Promise<any> => {
  const area = await practiceRepo.findOneBy({ id: Number(req.params.id) });
  if (!area) return res.status(404).json({ message: "Not found" });

  return res.json(area);
};

/**
 * @openapi
 * /api/business/practice-areas/{id}:
 *   put:
 *     summary: Update business practice area
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: BusinessPracticeArea ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Business practice area updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BusinessPracticeArea'
 *       404:
 *         description: Not found
 */
export const updatePracticeArea = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const { name } = req.body;

  const area = await practiceRepo.findOneBy({ id: Number(id) });
  if (!area) return res.status(404).json({ message: "Not found" });

  area.name = name;
  area.updatedAt = new Date();
  await practiceRepo.save(area);
  return res.json(area);
};

/**
 * @openapi
 * /api/business/practice-areas/{id}:
 *   delete:
 *     summary: Soft delete business practice area
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: BusinessPracticeArea ID
 *     responses:
 *       200:
 *         description: Business practice area soft deleted successfully
 *       404:
 *         description: Business practice area not found
 */
export const deletePracticeArea = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  const businessarea = await practiceRepo.findOne({ where: { id: Number(id) } });

  if (!businessarea) {
    return res.status(404).json({ message: "Business practice area not found" });
  }

  // Set isDelete to true instead of actually deleting
  businessarea.isDelete = true;
  businessarea.updatedAt = new Date();
  await businessTypeRepo.save(businessarea);

  return res.json({ message: "Business practice area soft deleted successfully" });
};



