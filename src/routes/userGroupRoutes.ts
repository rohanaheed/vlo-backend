import { Router } from "express";
import {
  createUserGroup,
  getAllUserGroups,
  getUserGroupById,
  updateUserGroup,
  deleteUserGroup,
  getUsersInGroup,
  addCustomPermission,
  removeCustomPermission
} from "../controllers/userGroupController";
import { validateRequest } from "../middleware/validateRequest";
import {
  userGroupSchema,
  updateUserGroupSchema,
  customPermissionSchema
} from "../utils/validators/inputValidator";
import { authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

// Create a new user group
router.post(
  "/",
  authorize(["super_admin"]),
  validateRequest(userGroupSchema),
  asyncHandler(createUserGroup)
);

// Get all user groups with pagination and search
router.get(
  "/",
  authorize(["super_admin"]),
  asyncHandler(getAllUserGroups)
);

// Get user group by ID
router.get(
  "/:id",
  authorize(["super_admin"]),
  asyncHandler(getUserGroupById)
);

// Update user group
router.put(
  "/:id",
  authorize(["super_admin"]),
  validateRequest(updateUserGroupSchema),
  asyncHandler(updateUserGroup)
);

// Soft delete user group
router.delete(
  "/:id",
  authorize(["super_admin"]),
  asyncHandler(deleteUserGroup)
);

// Get users in a group
router.get(
  "/:id/users",
  authorize(["super_admin"]),
  asyncHandler(getUsersInGroup)
);

// Add custom permission to group
router.post(
  "/:id/permissions",
  authorize(["super_admin"]),
  validateRequest(customPermissionSchema),
  asyncHandler(addCustomPermission)
);

// Remove custom permission from group
router.delete(
  "/:id/permissions/:permissionName",
  authorize(["super_admin"]),
  asyncHandler(removeCustomPermission)
);

export default router;
