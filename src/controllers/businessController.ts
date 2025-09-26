import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { BusinessType } from "../entity/BusinessType";
import { BusinessEntity } from "../entity/BusniessEntity";
import { BusinessPracticeArea } from "../entity/BusinessPracticeArea";
import { Not } from 'typeorm'

const businessEntityRepo = AppDataSource.getRepository(BusinessEntity);
const practiceRepo = AppDataSource.getRepository(BusinessPracticeArea);
const businessTypeRepo = AppDataSource.getRepository(BusinessType);

/**
 * @swagger
 * /api/business/type:
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
 * @swagger
 * /api/business/type:
 *   get:
 *     summary: Get all business types (paginated)
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page (default 10)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Filter business types by name (partial match)
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, dsc, desc]
 *           default: asc
 *         description: Sort order for results (asc, dsc/desc)
 *     responses:
 *       200:
 *         description: List of business types with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BusinessTypeInput'
 *                 total:
 *                   type: integer
 *                   description: Total number of business types
 *                 page:
 *                   type: integer
 *                   description: Current page number
 *                 limit:
 *                   type: integer
 *                   description: Number of items per page
 */
// export const getAllBusinessTypes = async (req: Request, res: Response): Promise<any> => {
//   const page = parseInt(req.query.page as string) || 1;
//   const limit = parseInt(req.query.limit as string) || 10;
//   const skip = (page - 1) * limit;

//   // Get order param, default to ASC, allow 'asc' or 'dsc'
//   let orderParam = (req.query.order as string)?.toLowerCase() || "asc";
//   let order: "ASC" | "DESC" = orderParam === "dsc" || orderParam === "desc" ? "DESC" : "ASC";

//   // Get search param
//   const search = (req.query.search as string) || "";

//   // Build where clause
//   let where: any = { isDelete: false };


//   const [types, total] = await businessTypeRepo.findAndCount({
//     where,
//     skip,
//     take: limit,
//     order: { id: order }
//   });

//   return res.json({
//     data: types,
//     total,
//     page,
//     limit
//   });
// };

export const getAllBusinessTypes = async (req: Request, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const search = (req.query.search as string) || "";
    const orderParam = (req.query.order as string)?.toLowerCase() || "asc";
    const order: "ASC" | "DESC" = orderParam === "desc" || orderParam === "dsc" ? "DESC" : "ASC";

    const qb = businessTypeRepo.createQueryBuilder("bt")
      .where("bt.isDelete = :isDelete", { isDelete: false });
    if (search.trim()) {
      qb.andWhere(
        "(MATCH(bt.name) AGAINST (:search IN NATURAL LANGUAGE MODE) OR bt.name LIKE :likeSearch)",
        {
          search,
          likeSearch: `%${search}%`,
        }
      )
        .addSelect("MATCH(bt.name) AGAINST (:search IN NATURAL LANGUAGE MODE)", "relevance")
        .orderBy("relevance", "DESC");
    } else {
      qb.orderBy("bt.id", order);
    }

    const [types, total] = await qb
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return res.json({
      success: true,
      data: types,
      total,
      page,
      limit
    });
  } catch (error) {
    console.error("Error fetching business types:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


/**
 * @swagger
 * /api/business/type/{id}:
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
 *               $ref: '#/components/schemas/BusinessTypeInput'
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
 * @swagger
 * /api/business/type/{id}:
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
 *               $ref: '#/components/schemas/BusinessTypeInput'
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
 * @swagger
 * /api/business/type/{id}:
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

  const businessType = await businessTypeRepo.findOne({ where: { id: Number(id), isDelete: false } });

  if (!businessType) {
    return res.status(404).json({ message: "BusinessType not found" });
  }

  // Set isDelete to true instead of actually deleting
  businessType.isDelete = true;
  await businessTypeRepo.save(businessType);

  return res.json({ message: "BusinessType soft deleted successfully" });
};

/**
 * Routes for business entity
 * 
 * */

/**
 * @swagger
 * /api/business/entity:
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
 * @swagger
 * /api/business/entity:
 *   get:
 *     summary: Get all business entities (paginated)
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page (default 10)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter business entities by name
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc, ASC, DESC]
 *           default: asc
 *         description: Order of results by id or relevance (asc or desc)
 *     responses:
 *       200:
 *         description: List of business entities with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BusinessEntity'
 *                 total:
 *                   type: integer
 *                   description: Total number of business entities
 *                 page:
 *                   type: integer
 *                   description: Current page number
 *                 limit:
 *                   type: integer
 *                   description: Number of items per page
 */
export const getAllBusinessEntities = async (req: Request, res: Response): Promise<any> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  // Get order param, default ASC
  let orderParam = (req.query.order as string)?.toLowerCase() || "asc";
  let order: "ASC" | "DESC" = orderParam === "dsc" || orderParam === "desc" ? "DESC" : "ASC";

  // Search param
  const search = (req.query.search as string) || "";

  const qb = businessEntityRepo.createQueryBuilder("be")
    .where("be.isDelete = false");

  if (search.trim()) {
    qb.andWhere(
      "(MATCH(be.name) AGAINST (:search IN NATURAL LANGUAGE MODE) OR be.name LIKE :likeSearch)",
      {
        search,
        likeSearch: `%${search}%`,
      }
    )
      .addSelect("MATCH(be.name) AGAINST (:search IN NATURAL LANGUAGE MODE)", "relevance")
      .orderBy("relevance", "DESC");
  } else {
    qb.orderBy("be.id", order);
  }

  qb.skip(skip).take(limit);

  const [entities, total] = await qb.getManyAndCount();

  return res.json({
    data: entities,
    total,
    page,
    limit
  });
};


/**
 * @swagger
 * /api/business/entity/{id}:
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
 * @swagger
 * /api/business/entity/{id}:
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
 * @swagger
 * /api/business/entity/{id}:
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

  const businessEntity = await businessEntityRepo.findOne({ where: { id: Number(id), isDelete: false } });

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
 * @swagger
 * /api/business/area:
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
 *               - code
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       201:
 *         description: Business practice area created successfully
 *       409:
 *         description: Already exists
 */
export const createPracticeArea = async (req: Request, res: Response): Promise<any> => {
  const { name, code } = req.body;

  const existing = await practiceRepo.findOneBy({ name });
  if (existing) {
    return res.status(409).json({ message: "Already exists" });
  }

  const area = practiceRepo.create({ name, code, isDelete: false, createdAt: new Date(), updatedAt: new Date() });
  await practiceRepo.save(area);
  return res.status(201).json(area);
};


/**
 * @swagger
 * /api/business/area:
 *   get:
 *     summary: Get all business practice areas (paginated)
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page (default 10)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter business practice areas by name
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc, ASC, DESC]
 *           default: asc
 *         description: Order of results by id or relevance (asc or desc)
 *     responses:
 *       200:
 *         description: List of business practice areas with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BusinessPracticeArea'
 *                 total:
 *                   type: integer
 *                   description: Total number of business practice areas
 *                 page:
 *                   type: integer
 *                   description: Current page number
 *                 limit:
 *                   type: integer
 *                   description: Number of items per page
 */
export const getAllPracticeAreas = async (req: Request, res: Response): Promise<any> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  // Get order param, default ASC
  let orderParam = (req.query.order as string)?.toLowerCase() || "asc";
  let order: "ASC" | "DESC" = orderParam === "dsc" || orderParam === "desc" ? "DESC" : "ASC";

  // Search param
  const search = (req.query.search as string) || "";

  const qb = practiceRepo.createQueryBuilder("pa")
    .where("pa.isDelete = false");

  if (search.trim()) {
    qb.andWhere(
      "(MATCH(pa.name) AGAINST (:search IN NATURAL LANGUAGE MODE) OR pa.name LIKE :likeSearch)",
      {
        search,
        likeSearch: `%${search}%`,
      }
    )
      .addSelect("MATCH(pa.name) AGAINST (:search IN NATURAL LANGUAGE MODE)", "relevance")
      .orderBy("relevance", "DESC");
  } else {
    qb.orderBy("pa.id", order);
  }

  qb.skip(skip).take(limit);

  const [areas, total] = await qb.getManyAndCount();

  return res.json({
    data: areas,
    total,
    page,
    limit
  });
};


/**
 * @swagger
 * /api/business/area/{id}:
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
  const area = await practiceRepo.findOneBy({ id: Number(req.params.id), isDelete: false });
  if (!area) return res.status(404).json({ message: "Not found" });

  return res.json(area);
};

/**
 * @swagger
 * /api/business/area/{id}:
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
 *               - code
 *             properties:
 *               name:
 *                 type: string
 *               code:
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
  const { name, code } = req.body;

  const area = await practiceRepo.findOneBy({ id: Number(id), isDelete: false });
  if (!area) return res.status(404).json({ message: "Not found" });

  area.name = name;
  area.code = code;
  area.updatedAt = new Date();
  await practiceRepo.save(area);
  return res.json(area);
};

/**
 * @swagger
 * /api/business/area/{id}:
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

  const businessarea = await practiceRepo.findOne({ where: { id: Number(id), isDelete: false } });

  if (!businessarea) {
    return res.status(404).json({ message: "Business practice area not found" });
  }

  // Set isDelete to true instead of actually deleting
  businessarea.isDelete = true;
  businessarea.updatedAt = new Date();
  await businessTypeRepo.save(businessarea);

  return res.json({ message: "Business practice area soft deleted successfully" });
};



