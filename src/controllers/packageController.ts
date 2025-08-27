import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { Package } from "../entity/Package";

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
 *             $ref: '#/components/schemas/Package'
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
    monthlyPrice,
    annualPrice,
    billingCycle,
    duration,
    maxEmployees,
    maxClients,
    isFree,
    isPrivate,
    isAutoRenewal,
    isActive,
    monthlyStatus,
    annualStatus,
    isDefault,
    moduleInPackage
  } = req.body;

  // Check if package with same name already exists
  const existing = await packageRepo.findOneBy({ name });
  if (existing) {
    return res.status(409).json({ message: "Package with this name already exists" });
  }

  const newPackage = packageRepo.create({
    name,
    description,
    monthlyPrice,
    annualPrice,
    billingCycle,
    duration,
    maxEmployees,
    maxClients,
    isFree,
    isPrivate,
    isAutoRenewal,
    isActive,
    monthlyStatus,
    annualStatus,
    isDefault,
    // moduleInPackage,
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
 *             $ref: '#/components/schemas/Package'
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
    monthlyPrice,
    annualPrice,
    billingCycle,
    duration,
    maxEmployees,
    maxClients,
    isFree,
    isPrivate,
    isAutoRenewal,
    isActive,
    monthlyStatus,
    annualStatus,
    isDefault,
    moduleInPackage
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
  if (monthlyPrice !== undefined) updateData.monthlyPrice = monthlyPrice;
  if (annualPrice !== undefined) updateData.annualPrice = annualPrice;
  if (billingCycle !== undefined) updateData.billingCycle = billingCycle;
  if (duration !== undefined) updateData.duration = duration;
  if (maxEmployees !== undefined) updateData.maxEmployees = maxEmployees;
  if (maxClients !== undefined) updateData.maxClients = maxClients;
  if (isFree !== undefined) updateData.isFree = isFree;
  if (isPrivate !== undefined) updateData.isPrivate = isPrivate;
  if (isAutoRenewal !== undefined) updateData.isAutoRenewal = isAutoRenewal;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (monthlyStatus !== undefined) updateData.monthlyStatus = monthlyStatus;
  if (annualStatus !== undefined) updateData.annualStatus = annualStatus;
  if (isDefault !== undefined) updateData.isDefault = isDefault;
  // if (moduleInPackage !== undefined) updateData.moduleInPackage = moduleInPackage;
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
 * /api/packages/default:
 *   get:
 *     summary: Get default package
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Default package found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Package'
 *       404:
 *         description: Default package not found
 */
// Get default package
export const getDefaultPackage = async (req: Request, res: Response): Promise<any> => {
  const packageItem = await packageRepo.findOne({
    where: { isDefault: true, isActive: true, isDelete: false }
  });

  if (!packageItem) {
    return res.status(404).json({ message: "Default package not found" });
  }

  return res.json(packageItem);
};

/**
 * @openapi
 * /api/packages/free:
 *   get:
 *     summary: Get free packages
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
// Get free packages
export const getFreePackages = async (req: Request, res: Response): Promise<any> => {
  const packages = await packageRepo.find({
    where: { isFree: true, isActive: true, isDelete: false },
    order: { createdAt: "DESC" }
  });
  return res.json(packages);
};

/**
 * @openapi
 * /api/packages/{id}/auto-renewal:
 *   patch:
 *     summary: Enable/Disable auto-renewal for a package
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
 *               isAutoRenewal:
 *                 type: boolean
 *                 description: Enable or disable auto-renewal
 *     responses:
 *       200:
 *         description: Auto-renewal status updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 package:
 *                   $ref: '#/components/schemas/Package'
 *       404:
 *         description: Package not found
 */
// Enable/Disable auto-renewal for a package
export const toggleAutoRenewal = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const { isAutoRenewal } = req.body;

  const packageItem = await packageRepo.findOne({
    where: { id: Number(id), isDelete: false }
  });

  if (!packageItem) {
    return res.status(404).json({ message: "Package not found" });
  }

  // Update the auto-renewal setting
  packageItem.isAutoRenewal = isAutoRenewal;
  await packageRepo.save(packageItem);

  return res.json({
    message: `Auto-renewal ${isAutoRenewal ? 'enabled' : 'disabled'} successfully`,
    package: packageItem
  });
};
