import { Router } from "express";
import { signup, login } from "../controllers/authController";
import { validateRequest } from "../middleware/validateRequest";
import { signupSchema, loginSchema } from "../utils/validators/authValidator";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.post("/signup", validateRequest(signupSchema), asyncHandler(signup));
router.post("/login", validateRequest(loginSchema), asyncHandler(login));

export default router;