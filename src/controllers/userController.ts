import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { User } from "../entity/User";
import { UserGroup } from "../entity/UserGroup";

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
export const getUsers = async (_req: Request, res: Response): Promise<any> => {
  const userRepo = AppDataSource.getRepository(User);
  const users = await userRepo.find();
  res.json(users);
};

/**
 * @openapi
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
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
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
export const createUser = async (req: Request, res: Response): Promise<any> => {
  const userRepo = AppDataSource.getRepository(User);
  const user = userRepo.create(req.body);
  const savedUser = await userRepo.save(user);
  res.status(201).json(savedUser);
};

/**
 * @openapi
 * /api/users/{id}/group:
 *   put:
 *     summary: Assign user to a group
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userGroupId
 *             properties:
 *               userGroupId:
 *                 type: integer
 *                 description: ID of the user group to assign
 *     responses:
 *       200:
 *         description: User assigned to group successfully
 *       404:
 *         description: User or group not found
 */
export const assignUserToGroup = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const { userGroupId } = req.body;

  const userRepo = AppDataSource.getRepository(User);
  const userGroupRepo = AppDataSource.getRepository(UserGroup);

  const user = await userRepo.findOne({
    where: { id: Number(id), isDelete: false }
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Verify group exists
  const group = await userGroupRepo.findOne({
    where: { id: userGroupId, isDelete: false }
  });

  if (!group) {
    return res.status(404).json({ message: "User group not found" });
  }

  user.userGroupId = userGroupId;
  user.updatedAt = new Date();
  await userRepo.save(user);

  return res.json({
    success: true,
    message: "User assigned to group successfully",
    data: {
      userId: user.id,
      userGroupId: group.id,
      groupTitle: group.title
    }
  });
};

/**
 * @openapi
 * /api/users/{id}/permissions:
 *   get:
 *     summary: Get user's effective permissions
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User's permissions
 *       404:
 *         description: User not found
 */
export const getUserPermissions = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;

  const userRepo = AppDataSource.getRepository(User);
  const userGroupRepo = AppDataSource.getRepository(UserGroup);

  const user = await userRepo.findOne({
    where: { id: Number(id), isDelete: false }
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Super admins have full access
  if (user.role === "super_admin") {
    return res.json({
      success: true,
      data: {
        userId: user.id,
        role: "super_admin",
        hasFullAccess: true,
        permissions: null,
        customPermissions: null,
        message: "Super admin has full access to all modules"
      }
    });
  }

  // Check if user has a group assigned
  if (!user.userGroupId) {
    return res.json({
      success: true,
      data: {
        userId: user.id,
        role: user.role,
        hasFullAccess: false,
        group: null,
        permissions: null,
        customPermissions: null,
        message: "User is not assigned to any group"
      }
    });
  }

  const group = await userGroupRepo.findOne({
    where: { id: user.userGroupId, isDelete: false }
  });

  if (!group) {
    return res.json({
      success: true,
      data: {
        userId: user.id,
        role: user.role,
        hasFullAccess: false,
        group: null,
        permissions: null,
        customPermissions: null,
        message: "User's assigned group not found or inactive"
      }
    });
  }

  return res.json({
    success: true,
    data: {
      userId: user.id,
      role: user.role,
      hasFullAccess: false,
      group: {
        id: group.id,
        title: group.title
      },
      permissions: group.permissions,
      customPermissions: group.customPermissions
    }
  });
};
