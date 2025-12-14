import { Request, RequestHandler, Response } from "express";
import { NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../config/db";
import { User } from "../entity/User";
import { UserGroup, PermissionLevel } from "../entity/UserGroup";

const JWT_SECRET = process.env.JWT_SECRET || "your_secret";

// Map module names to permission keys in the permissions object
const MODULE_KEY_MAP: Record<string, string> = {
  "clients_matter": "clientsAndMatter",
  "clientsAndMatter": "clientsAndMatter",
  "consultations": "consultations",
  "accounts": "accounts",
  "receipt_book": "receiptBook",
  "receiptBook": "receiptBook",
  "contact_book": "contactBook",
  "contactBook": "contactBook",
  "log_book": "logBook",
  "logBook": "logBook",
  "reports": "reports"
};

// Permission level hierarchy (higher number = more access)
const PERMISSION_HIERARCHY: Record<PermissionLevel, number> = {
  "Full Access": 4,
  "Data Entry": 3,
  "Read Only": 2,
  "Access Denied": 1
};

// Extended request interface with user and permissions
export interface AuthenticatedRequest extends Request {
  user?: User;
  userGroup?: UserGroup;
}

export const authorize = (roles?: string[]): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized" });
      return; // <== ✅ Return void here
    }

    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string };

      // Get user from database by id
      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOne({ where: { id: decoded.id } });

      if (!user) {
        res.status(401).json({ message: "User not found" });
        return;
      }

      // Check if user is deleted
      if (user.isDelete) {
        res.status(403).json({ message: "Account has been deactivated" });
        return;
      }

      // Add user object to request
      (req as any).user = user;

      if (roles && !roles.includes(decoded.role)) {
        res.status(403).json({ message: "Forbidden: insufficient role" });
        return; // <== ✅ Return void
      }

      next(); // <== ✅ Only next() if authorized
    } catch (err) {
      res.status(401).json({ message: "Invalid token" });
    }
  };
};

/**
 * Permission-based authorization middleware
 * Checks if the user has the required permission level for a specific module
 *
 * @param module - The module to check permission for (e.g., "reports", "accounts")
 * @param requiredLevel - The minimum permission level required (default: "Read Only")
 */
export const authorizeWithPermission = (
  module: string,
  requiredLevel: PermissionLevel = "Read Only"
): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string };

      // Get user from database
      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOne({ where: { id: decoded.id } });

      if (!user) {
        res.status(401).json({ message: "User not found" });
        return;
      }

      if (user.isDelete) {
        res.status(403).json({ message: "Account has been deactivated" });
        return;
      }

      // Add user to request
      (req as AuthenticatedRequest).user = user;

      // Super admins bypass all permission checks
      if (user.role === "super_admin") {
        next();
        return;
      }

      // Check if user has a group assigned
      if (!user.userGroupId) {
        res.status(403).json({ message: "User not assigned to any group" });
        return;
      }

      // Get user's group
      const userGroupRepo = AppDataSource.getRepository(UserGroup);
      const userGroup = await userGroupRepo.findOne({
        where: { id: user.userGroupId, isDelete: false, isActive: true }
      });

      if (!userGroup) {
        res.status(403).json({ message: "User group not found or inactive" });
        return;
      }

      // Add group to request
      (req as AuthenticatedRequest).userGroup = userGroup;

      // Determine permission level for the module
      const permissionKey = MODULE_KEY_MAP[module] || module;
      let userPermissionLevel: PermissionLevel = "Access Denied";

      // Check default permissions
      if (userGroup.permissions && (userGroup.permissions as any)[permissionKey]) {
        userPermissionLevel = (userGroup.permissions as any)[permissionKey];
      }

      // Check custom permissions (override default if exists)
      if (userGroup.customPermissions) {
        const customPerm = userGroup.customPermissions.find(
          p => p.module === module || p.module === permissionKey
        );
        if (customPerm) {
          userPermissionLevel = customPerm.level;
        }
      }

      // Verify permission level meets requirement
      const requiredHierarchy = PERMISSION_HIERARCHY[requiredLevel];
      const userHierarchy = PERMISSION_HIERARCHY[userPermissionLevel];

      if (userHierarchy < requiredHierarchy) {
        res.status(403).json({
          message: `Insufficient permissions for ${module}. Required: ${requiredLevel}, Your level: ${userPermissionLevel}`
        });
        return;
      }

      next();
    } catch (err) {
      res.status(401).json({ message: "Invalid token" });
    }
  };
};

/**
 * Utility function to check if a user group has a specific permission level for a module
 */
export const hasPermission = (
  userGroup: UserGroup,
  module: string,
  requiredLevel: PermissionLevel
): boolean => {
  const permissionKey = MODULE_KEY_MAP[module] || module;
  let userPermissionLevel: PermissionLevel = "Access Denied";

  if (userGroup.permissions && (userGroup.permissions as any)[permissionKey]) {
    userPermissionLevel = (userGroup.permissions as any)[permissionKey];
  }

  if (userGroup.customPermissions) {
    const customPerm = userGroup.customPermissions.find(
      p => p.module === module || p.module === permissionKey
    );
    if (customPerm) {
      userPermissionLevel = customPerm.level;
    }
  }

  return PERMISSION_HIERARCHY[userPermissionLevel] >= PERMISSION_HIERARCHY[requiredLevel];
};
