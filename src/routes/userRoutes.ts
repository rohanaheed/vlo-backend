import { Router } from "express";
import { getUsers, createUser } from "../controllers/userController";
import { authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.get("/", authorize(["super_admin"]), asyncHandler(getUsers));
router.post("/", authorize(["super_admin"]), asyncHandler(createUser));

export default router;
