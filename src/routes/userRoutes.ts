import { Router } from "express";
import { getUsers, createUser, assignUserToGroup, getUserPermissions } from "../controllers/userController";
import { authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { validateRequest } from "../middleware/validateRequest";
import { assignUserGroupSchema } from "../utils/validators/inputValidator";

const router = Router();

router.get("/", authorize(["super_admin"]), asyncHandler(getUsers));
router.post("/", authorize(["super_admin"]), asyncHandler(createUser));

// Assign user to a group
router.put(
  "/:id/group",
  authorize(["super_admin"]),
  validateRequest(assignUserGroupSchema),
  asyncHandler(assignUserToGroup)
);

// Get user's effective permissions
router.get(
  "/:id/permissions",
  authorize(["super_admin"]),
  asyncHandler(getUserPermissions)
);

export default router;
