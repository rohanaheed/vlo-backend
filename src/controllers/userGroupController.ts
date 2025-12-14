import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { UserGroup, DefaultPermissions, ModulePermission, PermissionLevel } from "../entity/UserGroup";
import { User } from "../entity/User";
import { Like } from "typeorm";

const userGroupRepo = AppDataSource.getRepository(UserGroup);
const userRepo = AppDataSource.getRepository(User);

// Default permission levels for new groups
const DEFAULT_PERMISSIONS: DefaultPermissions = {
  clientsAndMatter: "Access Denied",
  consultations: "Access Denied",
  accounts: "Access Denied",
  receiptBook: "Access Denied",
  contactBook: "Access Denied",
  logBook: "Access Denied",
  reports: "Access Denied"
};

/**
 * @swagger
 * /api/user-groups:
 *   post:
 *     summary: Create a new user group
 *     tags: [UserGroups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserGroupInput'
 *     responses:
 *       201:
 *         description: User group created successfully
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: User group with this title already exists
 */
export const createUserGroup = async (req: Request, res: Response): Promise<any> => {
  const { title, description, permissions, customPermissions } = req.body;

  const existing = await userGroupRepo.findOne({
    where: { title, isDelete: false }
  });

  if (existing) {
    return res.status(409).json({ message: "User group with this title already exists" });
  }

  const newGroup = userGroupRepo.create({
    title,
    description: description || "",
    permissions: permissions || DEFAULT_PERMISSIONS,
    customPermissions: customPermissions || null,
    isActive: true,
    isDelete: false,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  await userGroupRepo.save(newGroup);

  return res.status(201).json({
    success: true,
    data: newGroup,
    message: "User group created successfully"
  });
};

/**
 * @swagger
 * /api/user-groups:
 *   get:
 *     summary: Get all user groups (paginated)
 *     tags: [UserGroups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by title
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of user groups
 *       401:
 *         description: Unauthorized
 */
export const getAllUserGroups = async (req: Request, res: Response): Promise<any> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = (req.query.search as string) || "";
  const orderParam = (req.query.order as string)?.toLowerCase() || "desc";
  const order: "ASC" | "DESC" = orderParam === "asc" ? "ASC" : "DESC";

  const qb = userGroupRepo.createQueryBuilder("userGroup")
    .where("userGroup.isDelete = :isDelete", { isDelete: false });

  if (search) {
    qb.andWhere("userGroup.title LIKE :search", { search: `%${search}%` });
  }

  qb.orderBy("userGroup.createdAt", order)
    .skip((page - 1) * limit)
    .take(limit);

  const [groups, total] = await qb.getManyAndCount();

  // Get user count for each group
  const groupsWithUserCount = await Promise.all(
    groups.map(async (group) => {
      const userCount = await userRepo.count({
        where: { userGroupId: group.id, isDelete: false }
      });
      return { ...group, userCount };
    })
  );

  return res.json({
    success: true,
    data: groupsWithUserCount,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    totalItems: total
  });
};

/**
 * @swagger
 * /api/user-groups/{id}:
 *   get:
 *     summary: Get user group by ID
 *     tags: [UserGroups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User group ID
 *     responses:
 *       200:
 *         description: User group details
 *       404:
 *         description: User group not found
 */
export const getUserGroupById = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  const group = await userGroupRepo.findOne({
    where: { id: Number(id), isDelete: false }
  });

  if (!group) {
    return res.status(404).json({ message: "User group not found" });
  }

  // Get user count
  const userCount = await userRepo.count({
    where: { userGroupId: group.id, isDelete: false }
  });

  return res.json({
    success: true,
    data: { ...group, userCount }
  });
};

/**
 * @swagger
 * /api/user-groups/{id}:
 *   put:
 *     summary: Update user group
 *     tags: [UserGroups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserGroupUpdate'
 *     responses:
 *       200:
 *         description: User group updated successfully
 *       404:
 *         description: User group not found
 *       409:
 *         description: User group with this title already exists
 */
export const updateUserGroup = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  const group = await userGroupRepo.findOne({
    where: { id: Number(id), isDelete: false }
  });

  if (!group) {
    return res.status(404).json({ message: "User group not found" });
  }

  // Check if title is being changed and conflicts
  if (req.body.title && req.body.title !== group.title) {
    const existing = await userGroupRepo.findOne({
      where: { title: req.body.title, isDelete: false }
    });
    if (existing) {
      return res.status(409).json({ message: "User group with this title already exists" });
    }
  }

  const allowedFields = ["title", "description", "permissions", "customPermissions", "isActive"];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      (group as any)[field] = req.body[field];
    }
  }

  group.updatedAt = new Date();
  await userGroupRepo.save(group);

  return res.json({
    success: true,
    data: group,
    message: "User group updated successfully"
  });
};

/**
 * @swagger
 * /api/user-groups/{id}:
 *   delete:
 *     summary: Delete user group (soft delete)
 *     tags: [UserGroups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User group deleted successfully
 *       400:
 *         description: Cannot delete group with assigned users
 *       404:
 *         description: User group not found
 */
export const deleteUserGroup = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  const group = await userGroupRepo.findOne({
    where: { id: Number(id), isDelete: false }
  });

  if (!group) {
    return res.status(404).json({ message: "User group not found" });
  }

  // Check if group has users
  const userCount = await userRepo.count({
    where: { userGroupId: group.id, isDelete: false }
  });

  if (userCount > 0) {
    return res.status(400).json({
      message: "Cannot delete group with assigned users. Please reassign users first."
    });
  }

  group.isDelete = true;
  group.updatedAt = new Date();
  await userGroupRepo.save(group);

  return res.json({
    success: true,
    message: "User group deleted successfully"
  });
};

/**
 * @swagger
 * /api/user-groups/{id}/users:
 *   get:
 *     summary: Get users in a group
 *     tags: [UserGroups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of users in the group
 *       404:
 *         description: User group not found
 */
export const getUsersInGroup = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  const group = await userGroupRepo.findOne({
    where: { id: Number(id), isDelete: false }
  });

  if (!group) {
    return res.status(404).json({ message: "User group not found" });
  }

  const [users, total] = await userRepo.findAndCount({
    where: { userGroupId: group.id, isDelete: false },
    select: ["id", "name", "email", "role", "createdAt"],
    skip: (page - 1) * limit,
    take: limit,
    order: { createdAt: "DESC" }
  });

  return res.json({
    success: true,
    data: users,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    totalItems: total
  });
};

/**
 * @swagger
 * /api/user-groups/{id}/permissions:
 *   post:
 *     summary: Add custom permission to group
 *     tags: [UserGroups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - module
 *               - level
 *             properties:
 *               module:
 *                 type: string
 *               level:
 *                 type: string
 *                 enum: [Full Access, Access Denied, Data Entry, Read Only]
 *     responses:
 *       200:
 *         description: Custom permission added successfully
 *       404:
 *         description: User group not found
 */
export const addCustomPermission = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const { module, level } = req.body;

  const group = await userGroupRepo.findOne({
    where: { id: Number(id), isDelete: false }
  });

  if (!group) {
    return res.status(404).json({ message: "User group not found" });
  }

  const customPermissions: ModulePermission[] = group.customPermissions || [];

  // Check if permission already exists
  const existingIndex = customPermissions.findIndex(p => p.module === module);

  if (existingIndex >= 0) {
    customPermissions[existingIndex].level = level;
  } else {
    customPermissions.push({ module, level });
  }

  group.customPermissions = customPermissions;
  group.updatedAt = new Date();
  await userGroupRepo.save(group);

  return res.json({
    success: true,
    data: group,
    message: "Custom permission added successfully"
  });
};

/**
 * @swagger
 * /api/user-groups/{id}/permissions/{permissionName}:
 *   delete:
 *     summary: Remove custom permission from group
 *     tags: [UserGroups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: permissionName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Custom permission removed successfully
 *       404:
 *         description: User group or permission not found
 */
export const removeCustomPermission = async (req: Request, res: Response): Promise<any> => {
  const { id, permissionName } = req.params;

  const group = await userGroupRepo.findOne({
    where: { id: Number(id), isDelete: false }
  });

  if (!group) {
    return res.status(404).json({ message: "User group not found" });
  }

  if (!group.customPermissions || group.customPermissions.length === 0) {
    return res.status(404).json({ message: "Permission not found" });
  }

  const initialLength = group.customPermissions.length;
  group.customPermissions = group.customPermissions.filter(
    p => p.module !== permissionName
  );

  if (group.customPermissions.length === initialLength) {
    return res.status(404).json({ message: "Permission not found" });
  }

  group.updatedAt = new Date();
  await userGroupRepo.save(group);

  return res.json({
    success: true,
    message: "Custom permission removed successfully"
  });
};
