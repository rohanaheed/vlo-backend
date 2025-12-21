import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { BusinessType } from "../entity/BusinessType";
import { BusinessEntity } from "../entity/BusniessEntity";
import { BusinessPracticeArea } from "../entity/BusinessPracticeArea";
import { Subcategory } from "../entity/Subcategory";
import { CustomField } from "../entity/CustomField";
import { CustomfieldGroup } from "../entity/CustomfieldGroup";
import { businessEntitySchema, businessPracticeAreaSchema, businessTypeSchema, subcategorySchema, updateSubcategorySchema } from "../utils/validators/inputValidator";
import { Not } from "typeorm";

const businessEntityRepo = AppDataSource.getRepository(BusinessEntity);
const practiceRepo = AppDataSource.getRepository(BusinessPracticeArea);
const businessTypeRepo = AppDataSource.getRepository(BusinessType);
const subcategoryRepo = AppDataSource.getRepository(Subcategory);
const customFieldRepo = AppDataSource.getRepository(CustomField);
const customFieldGroupRepo = AppDataSource.getRepository(CustomfieldGroup);

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
  const { error, value } = businessTypeSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message,
        });
      }
  
  const name = value.name
  const existing = await businessTypeRepo.findOne({ 
    where : {
      name,
      isDelete : false
    }
   });

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
  const type = await businessTypeRepo.findOne({ 
    where : {
      id: Number(id),
      isDelete : false
    }
     });

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
   const { error, value } = businessTypeSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message,
        });
      }
  
  const name = value.name

  const type = await businessTypeRepo.findOne({ 
    where : {
      id: Number(id),
      isDelete : false
    }
   });

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
  const {error,value} = businessEntitySchema.validate(req.body)
  
  if(error){
    return res.status(400).json({
      success:false,
      message: error.details[0].message,
    })
  }
  const name = value.name
  const existing = await businessEntityRepo.findOne({
    where : {
      name,
      isDelete : false
    }
  });
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
  const entity = await businessEntityRepo.findOne({ 
    where : {
      id: Number(id),
      isDelete : false
    }
   });

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
  const {error,value} = businessEntitySchema.validate(req.body)
  
  if(error){
    return res.status(400).json({
      success:false,
      message: error.details[0].message,
    })
  }

  const name = value.name

  const entity = await businessEntityRepo.findOne({ 
    where: { id: Number(id), isDelete: false }
   });
  if (!entity) {
    return res.status(404).json({ message: "BusinessEntity not found" });
  }
  if (entity.name === name) {
    return res.status(400).json({ message: "New name must be different from current name" });
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
 *               - title
 *               - code
 *             properties:
 *               title:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       201:
 *         description: Business practice area created successfully
 *       409:
 *         description: Already exists
 */

export const createPracticeArea = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { error, value } = businessPracticeAreaSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const { title, code } = value;

  // check uniqueness by code
  const existing = await practiceRepo.findOne({
    where: {
      code,
      isDelete: false,
    },
  });

  if (existing) {
    return res.status(409).json({
      success: false,
      message: "Practice area with this code already exists",
    });
  }

  const area = practiceRepo.create({
    title,
    code,
    isDelete: false,
  });

  await practiceRepo.save(area);

  return res.status(201).json({
    success: true,
    data: area,
  });
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
    .where("pa.isDelete = :isDelete", { isDelete: false });

  if (search.trim()) {
    qb.andWhere(
      "(MATCH(pa.title) AGAINST (:search IN NATURAL LANGUAGE MODE) OR pa.title LIKE :likeSearch)",
      {
        search,
        likeSearch: `%${search}%`,
      }
    )
      .addSelect("MATCH(pa.title) AGAINST (:search IN NATURAL LANGUAGE MODE)", "relevance")
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
 *               - title
 *               - code
 *             properties:
 *               title:
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
export const updatePracticeArea = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { id } = req.params;

  const { error, value } = businessPracticeAreaSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const { title, code } = value;

  const area = await practiceRepo.findOne({
    where: {
      id: Number(id),
      isDelete: false,
    },
  });

  if (!area) {
    return res.status(404).json({
      success: false,
      message: "Practice area not found",
    });
  }

  // check if code already used by another record
  const codeExists = await practiceRepo.findOne({
    where: {
      code,
      isDelete: false,
      id: Not(Number(id))
    },
  });

  if (codeExists) {
    return res.status(409).json({
      success: false,
      message: "Practice area with this code already exists",
    });
  }

  area.title = title;
  area.code = code;
  area.updatedAt = new Date();

  await practiceRepo.save(area);

  return res.json({
    success: true,
    data: area,
  });
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
  await practiceRepo.save(businessarea);

  return res.json({ message: "Business practice area soft deleted successfully" });
};


/**
 * Routes for subcategories
 * 
 *
 * 
 * 
 *  */



/**
 * @swagger
 * components:
 *   schemas:
 *     Subcategory:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         title:
 *           type: string
 *         BusinessPracticeAreaId:
 *           type: integer
 *         isDelete:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/business/subcategory:
 *   post:
 *     summary: Create a new subcategory
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
 *               - title
 *               - BusinessPracticeAreaId
 *             properties:
 *               title:
 *                 type: string
 *               BusinessPracticeAreaId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Subcategory created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subcategory'
 *       409:
 *         description: Already exists
 */
export const createSubcategory = async (req: Request, res: Response): Promise<any> => {
  const {error,value} = subcategorySchema.validate(req.body)
  if(error){
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    })
  }
  const title = value.title;
  const BusinessPracticeAreaId = value.BusinessPracticeAreaId;
  // Check for existing subcategory with same title and BusinessPracticeAreaId
  const existing = await subcategoryRepo.findOneBy({ title, BusinessPracticeAreaId, isDelete: false });
  if (existing) {
    return res.status(409).json({ message: "Already exists" });
  }

  const subcategory = subcategoryRepo.create({
    title,
    BusinessPracticeAreaId,
    isDelete: false,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  await subcategoryRepo.save(subcategory);
  return res.status(201).json(subcategory);
};

/**
 * @swagger
 * /api/business/subcategory:
 *   get:
 *     summary: Get all subcategories (paginated)
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
 *         description: Search term to filter subcategories by title
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc, ASC, DESC]
 *           default: asc
 *         description: Order of results by id or relevance (asc or desc)
 *     responses:
 *       200:
 *         description: List of subcategories with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Subcategory'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 */
export const getAllSubcategories = async (req: Request, res: Response): Promise<any> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  let orderParam = (req.query.order as string)?.toLowerCase() || "asc";
  let order: "ASC" | "DESC" = orderParam === "dsc" || orderParam === "desc" ? "DESC" : "ASC";

  const search = (req.query.search as string) || "";

  const qb = subcategoryRepo.createQueryBuilder("sc")
    .where("sc.isDelete = :isDelete", { isDelete: false });

  if (search.trim()) {
    qb.andWhere(
      "(MATCH(sc.title) AGAINST (:search IN NATURAL LANGUAGE MODE) OR sc.title LIKE :likeSearch)",
      {
        search,
        likeSearch: `%${search}%`,
      }
    )
      .addSelect("MATCH(sc.title) AGAINST (:search IN NATURAL LANGUAGE MODE)", "relevance")
      .orderBy("relevance", "DESC");
  } else {
    qb.orderBy("sc.id", order);
  }

  qb.skip(skip).take(limit);

  const [subcategories, total] = await qb.getManyAndCount();

  return res.json({
    data: subcategories,
    total,
    page,
    limit
  });
};

/**
 * @swagger
 * /api/business/subcategory/{id}:
 *   get:
 *     summary: Get subcategory by ID
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Subcategory ID
 *     responses:
 *       200:
 *         description: Subcategory found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subcategory'
 *       404:
 *         description: Subcategory not found
 */
export const getSubcategoryById = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  const subcategory = await subcategoryRepo.findOne({ where: { id: Number(id), isDelete: false } });

  if (!subcategory) {
    return res.status(404).json({ message: "Subcategory not found" });
  }

  return res.json(subcategory);
};

/**
 * @swagger
 * /api/business/subcategory/{id}:
 *   put:
 *     summary: Update subcategory by ID
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Subcategory ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *     responses:
 *       200:
 *         description: Subcategory updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subcategory'
 *       404:
 *         description: Subcategory not found
 */
export const updateSubcategory = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const {error,value} = updateSubcategorySchema.validate(req.body)
  if(error){
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    })
  }
  const title = value.title;

  const subcategory = await subcategoryRepo.findOne({ where: { id: Number(id), isDelete: false } });

  if (!subcategory) {
    return res.status(404).json({ message: "Subcategory not found" });
  }
  if (subcategory.title === title) {
    return res.status(400).json({ message: "New name must be different from current name" });
  }
  subcategory.title = title;
  subcategory.updatedAt = new Date();

  await subcategoryRepo.save(subcategory);
  return res.json(subcategory);
};

/**
 * @swagger
 * /api/business/subcategory/{id}:
 *   delete:
 *     summary: Soft delete subcategory
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Subcategory ID
 *     responses:
 *       200:
 *         description: Subcategory soft deleted successfully
 *       404:
 *         description: Subcategory not found
 */
export const deleteSubcategory = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  const subcategory = await subcategoryRepo.findOne({ where: { id: Number(id), isDelete: false } });

  if (!subcategory) {
    return res.status(404).json({ message: "Subcategory not found" });
  }

  subcategory.isDelete = true;
  subcategory.updatedAt = new Date();
  await subcategoryRepo.save(subcategory);

  return res.json({ message: "Subcategory soft deleted successfully" });
};

/**
 * @swagger
 * components:
 *   schemas:
 *     CustomField:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         title:
 *           type: string
 *         type:
 *           type: string
 *           enum: [text, number, date, boolean, select]
 *         options?:
 *           type: array
 *           items:
 *             type: string
 *           description: Only for 'select' type
 *         isDelete:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/business/customfield:
 *   post:
 *     summary: Create a new custom field
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
 *               - title
 *               - type
 *             properties:
 *               title:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [text, number, date, boolean, select]
 *               templateKeyword:
 *                 type: string
 *               BusinessPracticeAreaId:
 *                 type: integer
 *               CustomfieldGroupId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Custom field created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CustomField'
 *       409:
 *         description: Already exists
 */
export const createCustomField = async (req: Request, res: Response): Promise<any> => {
  const { title, type, templateKeyword, BusinessPracticeAreaId, CustomfieldGroupId } = req.body;

  // Check for existing custom field with same name and not deleted
  const existing = await customFieldRepo.findOneBy({ title, isDelete: false });
  if (existing) {
    return res.status(409).json({ message: "Already exists" });
  }

  const customField = customFieldRepo.create({
    title,
    type,
    templateKeyword: templateKeyword,
    BusinessPracticeAreaId: BusinessPracticeAreaId,
    CustomfieldGroupId: CustomfieldGroupId,
    isDelete: false,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  await customFieldRepo.save(customField);
  return res.status(201).json(customField);
};


/**
 * @swagger
 * /api/business/customfield:
 *   get:
 *     summary: Get all custom fields (paginated, searchable, orderable)
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for title or templateKeyword
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *         description: Order of results by createdAt (ASC or DESC)
 *     responses:
 *       200:
 *         description: List of custom fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CustomField'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 */
export const getAllCustomFields = async (req: Request, res: Response): Promise<any> => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const search = (req.query.search as string) || "";
  let orderParam = (req.query.order as string)?.toLowerCase() || "asc";
  let order: "ASC" | "DESC" = orderParam === "dsc" || orderParam === "desc" ? "DESC" : "ASC";

  const qb = customFieldRepo.createQueryBuilder("customField")
    .where("customField.isDelete = :isDelete", { isDelete: false });

  if (search) {
    qb.andWhere(
      "(customField.title LIKE :search OR customField.templateKeyword LIKE :search)",
      { search: `%${search}%` }
    );
  }

  qb.orderBy("customField.createdAt", order)
    .skip((page - 1) * limit)
    .take(limit);

  const [data, total] = await qb.getManyAndCount();

  return res.json({ data, total, page, limit });
};

/**
 * @swagger
 * /api/business/customfield/{id}:
 *   get:
 *     summary: Get a custom field by ID
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: CustomField ID
 *     responses:
 *       200:
 *         description: Custom field found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CustomField'
 *       404:
 *         description: Custom field not found
 */
export const getCustomFieldById = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const customField = await customFieldRepo.findOne({ where: { id: Number(id), isDelete: false } });
  if (!customField) {
    return res.status(404).json({ message: "Custom field not found" });
  }
  return res.json(customField);
};

/**
 * @swagger
 * /api/business/customfield/{id}:
 *   put:
 *     summary: Update a custom field
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: CustomField ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [text, number, date, boolean, select]
 *               templateKeyword:
 *                 type: string
 *                 description: Only for 'select' type
 *     responses:
 *       200:
 *         description: Custom field updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CustomField'
 *       404:
 *         description: Custom field not found
 */
export const updateCustomField = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const { title, type, templateKeyword } = req.body;

  const customField = await customFieldRepo.findOne({ where: { id: Number(id), isDelete: false } });
  if (!customField) {
    return res.status(404).json({ message: "Custom field not found" });
  }

  if (title !== undefined) customField.title = title;
  if (type !== undefined) customField.type = type;
  if (templateKeyword !== undefined) customField.templateKeyword = templateKeyword;

  customField.updatedAt = new Date();
  await customFieldRepo.save(customField);
  return res.json(customField);
};

/**
 * @swagger
 * /api/business/customfield/{id}:
 *   delete:
 *     summary: Soft delete custom field
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: CustomField ID
 *     responses:
 *       200:
 *         description: Custom field soft deleted successfully
 *       404:
 *         description: Custom field not found
 */
export const deleteCustomField = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  const customField = await customFieldRepo.findOne({ where: { id: Number(id), isDelete: false } });

  if (!customField) {
    return res.status(404).json({ message: "Custom field not found" });
  }

  customField.isDelete = true;
  customField.updatedAt = new Date();
  await customFieldRepo.save(customField);

  return res.json({ message: "Custom field soft deleted successfully" });
};


/**
 * @swagger
 * components:
 *   schemas:
 *     CustomFieldGroup:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         title:
 *           type: string
 *         subcategoryId:
 *           type: integer
 *         linkedTo:
 *           type: string
 *         isDelete:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */


/**
 * @swagger
 * /api/business/customfieldgroup:
 *   post:
 *     summary: Create a new custom field group
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
 *               - title
 *               - SubcategoryId
 *               - linkedTo
 *             properties:
 *               title:
 *                 type: string
 *               subcategoryId:
 *                 type: integer
 *               linkedTo:
 *                 type: string
 *     responses:
 *       201:
 *         description: Custom field group created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CustomFieldGroup'
 *             example:
 *               id: 1
 *               title: "Group A"
 *               subcategoryId: 2
 *               linkedTo: "Product"
 *               isDelete: false
 *               createdAt: "2024-06-01T12:00:00.000Z"
 *               updatedAt: "2024-06-01T12:00:00.000Z"
 *       409:
 *         description: Already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: "CustomFieldGroup already exists"
 */
export const createCustomFieldGroup = async (req: Request, res: Response): Promise<any> => {
  const { title, subcategoryId, linkedTo } = req.body;

  const existing = await customFieldGroupRepo.findOneBy({ title, subcategoryId, linkedTo, isDelete: false });
  if (existing) {
    return res.status(409).json({ message: "CustomFieldGroup already exists" });
  }

  const group = customFieldGroupRepo.create({
    title,
    subcategoryId,
    linkedTo,
    isDelete: false,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  await customFieldGroupRepo.save(group);
  return res.status(201).json(group);
};


/**
 * @swagger
 * /api/business/customfieldgroup:
 *   get:
 *     summary: Get all custom field groups (paginated, searchable, orderable)
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
 *           default: 20
 *         description: Number of items per page (default 20)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for title or linkedTo
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc, ASC, DESC]
 *           default: asc
 *         description: Order of results by createdAt (asc or desc)
 *     responses:
 *       200:
 *         description: List of custom field groups
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CustomFieldGroup'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 */
export const getAllCustomFieldGroups = async (req: Request, res: Response): Promise<any> => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const search = (req.query.search as string) || "";
  let orderParam = (req.query.order as string)?.toLowerCase() || "asc";
  let order: "ASC" | "DESC" = orderParam === "dsc" || orderParam === "desc" ? "DESC" : "ASC";

  const qb = customFieldGroupRepo.createQueryBuilder("group")
    .leftJoin(Subcategory, "subcategory", "subcategory.id = group.subcategoryId AND subcategory.isDelete = false")
    .leftJoin(BusinessPracticeArea, "practiceArea", "practiceArea.id = subcategory.BusinessPracticeAreaId AND practiceArea.isDelete = false")
    .select([
      "group.id as id",
      "group.title as title",
      "group.subcategoryId as subcategoryId",
      "group.linkedTo as linkedTo",
      "group.isDelete as isDelete",
      "group.createdAt as createdAt",
      "group.updatedAt as updatedAt",
      "subcategory.title as subcategoryName",
      "practiceArea.title as practiceAreaName"
    ])
    .where("group.isDelete = :isDelete", { isDelete: false });

  if (search) {
    qb.andWhere(
      "(group.title LIKE :search OR group.linkedTo LIKE :search)",
      { search: `%${search}%` }
    );
  }

  qb.orderBy("group.createdAt", order)
    .skip((page - 1) * limit)
    .take(limit);

  const data = await qb.getRawMany();
  const totalResult = await customFieldGroupRepo.createQueryBuilder("group")
    .where("group.isDelete = :isDelete", { isDelete: false })
    .getCount();

  return res.json({ data, total: totalResult, page, limit });
};

/**
 * @swagger
 * /api/business/customfieldgroup/{id}:
 *   get:
 *     summary: Get a custom field group by ID
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: CustomFieldGroup ID
 *     responses:
 *       200:
 *         description: Custom field group found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CustomFieldGroup'
 *       404:
 *         description: CustomFieldGroup not found
 */
export const getCustomFieldGroupById = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  const result = await customFieldGroupRepo.createQueryBuilder("group")
    .leftJoin(Subcategory, "subcategory", "subcategory.id = group.subcategoryId AND subcategory.isDelete = false")
    .leftJoin(BusinessPracticeArea, "practiceArea", "practiceArea.id = subcategory.BusinessPracticeAreaId AND practiceArea.isDelete = false")
    .select([
      "group.id as id",
      "group.title as title",
      "group.subcategoryId as subcategoryId",
      "group.linkedTo as linkedTo",
      "group.isDelete as isDelete",
      "group.createdAt as createdAt",
      "group.updatedAt as updatedAt",
      "subcategory.title as subcategoryName",
      "practiceArea.title as practiceAreaName"
    ])
    .where("group.id = :id AND group.isDelete = :isDelete", { id: Number(id), isDelete: false })
    .getRawOne();

  if (!result) {
    return res.status(404).json({ message: "CustomFieldGroup not found" });
  }

  return res.json(result);
};

/**
 * @swagger
 * /api/business/customfieldgroup/{id}:
 *   put:
 *     summary: Update custom field group
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: CustomFieldGroup ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               linkedTo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Custom field group updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CustomFieldGroup'
 *       404:
 *         description: CustomFieldGroup not found
 */
export const updateCustomFieldGroup = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const { title, linkedTo } = req.body;

  const group = await customFieldGroupRepo.findOneBy({ id: Number(id), isDelete: false });
  if (!group) {
    return res.status(404).json({ message: "CustomFieldGroup not found" });
  }

  if (title !== undefined) group.title = title;
  if (linkedTo !== undefined) group.linkedTo = linkedTo;
  group.updatedAt = new Date();
  await customFieldGroupRepo.save(group);

  return res.json(group);
};

/**
 * @swagger
 * /api/business/customfieldgroup/{id}:
 *   delete:
 *     summary: Soft delete custom field group
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: CustomFieldGroup ID
 *     responses:
 *       200:
 *         description: Custom field group soft deleted successfully
 *       404:
 *         description: CustomFieldGroup not found
 */
export const deleteCustomFieldGroup = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  const group = await customFieldGroupRepo.findOneBy({ id: Number(id), isDelete: false });
  if (!group) {
    return res.status(404).json({ message: "CustomFieldGroup not found" });
  }

  group.isDelete = true;
  group.updatedAt = new Date();
  await customFieldGroupRepo.save(group);

  return res.json({ message: "Custom field group soft deleted successfully" });
};
