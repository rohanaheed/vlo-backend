import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { Package } from "../entity/Package";
import { MoreThan } from "typeorm";

const packageRepo = AppDataSource.getRepository(Package);

/**
 * @openapi
 * /api/packages:
 *   post:
 *     summary: Create a new package
 *     tags: [Packages]
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
 *                 description: Package name
 *               description:
 *                 type: string
 *                 description: Package description
 *               price:
 *                 type: number
 *                 description: Package price
 *               billingCycle:
 *                 type: string
 *                 enum: [Monthly, Annual]
 *                 description: Billing cycle
 *               isActive:
 *                 type: boolean
 *                 description: Whether the package is active
 *               includedFeatures:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     isEnabled:
 *                       type: boolean
 *                 description: List of included features
 *               integrations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     isEnabled:
 *                       type: boolean
 *                 description: List of integrations
 *               communicationTools:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     isEnabled:
 *                       type: boolean
 *                 description: List of communication tools
 *               cloudStorage:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     isEnabled:
 *                       type: boolean
 *                 description: List of cloud storage options
 *               socialMediaConnectors:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     isEnabled:
 *                       type: boolean
 *                 description: List of social media connectors
 *     responses:
 *       201:
 *         description: Package created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Package'
 *       409:
 *         description: Package with this name already exists
 */
// Create a new package
export const createPackage = async (req: Request, res: Response): Promise<any> => {
  const {
    name,
    description,
    price,
    billingCycle,
    isActive,
    includedFeatures,
    integrations,
    communicationTools,
    cloudStorage,
    socialMediaConnectors
  } = req.body;

  // Check if package with same name already exists
  const existing = await packageRepo.findOneBy({ name });
  if (existing) {
    return res.status(409).json({ message: "Package with this name already exists" });
  }

  const newPackage = packageRepo.create({
    name,
    description,
    price,
    billingCycle,
    isActive,
    includedFeatures,
    integrations,
    communicationTools,
    cloudStorage,
    socialMediaConnectors,
    isDelete: false
  });

  await packageRepo.save(newPackage);
  return res.status(201).json(newPackage);
};

/**
 * @openapi
 * /api/packages:
 *   get:
 *     summary: Get all packages (excluding soft deleted ones)
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of packages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Package'
 */
// Get all packages (excluding soft deleted ones)
export const getAllPackages = async (req: Request, res: Response): Promise<any> => {
  const packages = await packageRepo.find({
    where: { isDelete: false },
    order: { createdAt: "DESC" }
  });
  return res.json(packages);
};

/**
 * @openapi
 * /api/packages/{id}:
 *   get:
 *     summary: Get package by ID
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Package ID
 *     responses:
 *       200:
 *         description: Package found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Package'
 *       404:
 *         description: Package not found
 */
// Get package by ID
export const getPackageById = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const packageItem = await packageRepo.findOne({
    where: { id: Number(id), isDelete: false }
  });

  if (!packageItem) {
    return res.status(404).json({ message: "Package not found" });
  }

  return res.json(packageItem);
};

/**
 * @openapi
 * /api/packages/{id}:
 *   put:
 *     summary: Update package
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Package ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Package name
 *               description:
 *                 type: string
 *                 description: Package description
 *               price:
 *                 type: number
 *                 description: Package price
 *               billingCycle:
 *                 type: string
 *                 enum: [Monthly, Annual]
 *                 description: Billing cycle
 *               isActive:
 *                 type: boolean
 *                 description: Whether the package is active
 *               includedFeatures:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     isEnabled:
 *                       type: boolean
 *                 description: List of included features
 *               integrations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     isEnabled:
 *                       type: boolean
 *                 description: List of integrations
 *               communicationTools:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     isEnabled:
 *                       type: boolean
 *                 description: List of communication tools
 *               cloudStorage:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     isEnabled:
 *                       type: boolean
 *                 description: List of cloud storage options
 *               socialMediaConnectors:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     isEnabled:
 *                       type: boolean
 *                 description: List of social media connectors
 *     responses:
 *       200:
 *         description: Package updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Package'
 *       404:
 *         description: Package not found
 *       409:
 *         description: Package with this name already exists
 */
// Update package
export const updatePackage = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const {
    name,
    description,
    price,
    billingCycle,
    isActive,
    includedFeatures,
    integrations,
    communicationTools,
    cloudStorage,
    socialMediaConnectors
  } = req.body;

  const packageItem = await packageRepo.findOne({
    where: { id: Number(id), isDelete: false }
  });

  if (!packageItem) {
    return res.status(404).json({ message: "Package not found" });
  }

  // Check if name is being changed and if it conflicts with existing package
  if (name && name !== packageItem.name) {
    const existing = await packageRepo.findOneBy({ name });
    if (existing) {
      return res.status(409).json({ message: "Package with this name already exists" });
    }
  }

  // Update package fields
  const updateData: Partial<Package> = {};
  
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (price !== undefined) updateData.price = price;
  if (billingCycle !== undefined) updateData.billingCycle = billingCycle;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (includedFeatures !== undefined) updateData.includedFeatures = includedFeatures;
  if (integrations !== undefined) updateData.integrations = integrations;
  if (communicationTools !== undefined) updateData.communicationTools = communicationTools;
  if (cloudStorage !== undefined) updateData.cloudStorage = cloudStorage;
  if (socialMediaConnectors !== undefined) updateData.socialMediaConnectors = socialMediaConnectors;
  
  Object.assign(packageItem, updateData);

  await packageRepo.save(packageItem);
  return res.json(packageItem);
};

/**
 * @openapi
 * /api/packages/{id}:
 *   delete:
 *     summary: Soft delete package
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Package ID
 *     responses:
 *       200:
 *         description: Package soft deleted successfully
 *       404:
 *         description: Package not found
 */
// Soft delete package
export const deletePackage = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  const packageItem = await packageRepo.findOne({
    where: { id: Number(id), isDelete: false }
  });

  if (!packageItem) {
    return res.status(404).json({ message: "Package not found" });
  }

  // Set isDelete to true instead of actually deleting
  packageItem.isDelete = true;
  await packageRepo.save(packageItem);

  return res.json({ message: "Package soft deleted successfully" });
};

/**
 * @openapi
 * /api/packages/active:
 *   get:
 *     summary: Get active packages only
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active packages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Package'
 */
// Get active packages only
export const getActivePackages = async (req: Request, res: Response): Promise<any> => {
  const packages = await packageRepo.find({
    where: { isActive: true, isDelete: false },
    order: { createdAt: "DESC" }
  });
  return res.json(packages);
};

/**
 * @openapi
 * /api/packages/free:
 *   get:
 *     summary: Get free packages (price = 0)
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of free packages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Package'
 */
// Get free packages (price = 0)
export const getFreePackages = async (req: Request, res: Response): Promise<any> => {
  const packages = await packageRepo.find({
    where: { price: 0, isActive: true, isDelete: false },
    order: { createdAt: "DESC" }
  });
  return res.json(packages);
};

/**
 * @openapi
 * /api/packages/paid:
 *   get:
 *     summary: Get paid packages (price > 0)
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of paid packages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Package'
 */
// Get paid packages (price > 0)
export const getPaidPackages = async (req: Request, res: Response): Promise<any> => {
  const packages = await packageRepo.find({
    where: { price: MoreThan(0), isActive: true, isDelete: false },
    order: { createdAt: "DESC" }
  });
  return res.json(packages);
};

/**
 * @openapi
 * /api/packages/billing-cycle/{cycle}:
 *   get:
 *     summary: Get packages by billing cycle
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cycle
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Monthly, Annual]
 *         description: Billing cycle
 *     responses:
 *       200:
 *         description: List of packages for the specified billing cycle
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Package'
 */
// Get packages by billing cycle
export const getPackagesByBillingCycle = async (req: Request, res: Response): Promise<any> => {
  const { cycle } = req.params;
  
  if (cycle !== 'Monthly' && cycle !== 'Annual') {
    return res.status(400).json({ message: "Invalid billing cycle. Must be 'Monthly' or 'Annual'" });
  }

  const packages = await packageRepo.find({
    where: { billingCycle: cycle, isActive: true, isDelete: false },
    order: { createdAt: "DESC" }
  });
  return res.json(packages);
};
