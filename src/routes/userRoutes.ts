import { Router } from "express";
import { getUsers, createUser } from "../controllers/userController";
import { authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.get("/",  asyncHandler(getUsers));
router.post("/", asyncHandler(createUser));

export default router;
