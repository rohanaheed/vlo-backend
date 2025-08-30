import { Router } from "express";
import { signup, login, forgotPassword, verifyOTP, resetPassword, verifyUser } from "../controllers/authController";
import { validateRequest } from "../middleware/validateRequest";
import { signupSchema, loginSchema, forgotPasswordSchema, verifyOTPSchema, resetPasswordSchema, verifyUserSchema } from "../utils/validators/inputValidator";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.post("/signup", validateRequest(signupSchema), asyncHandler(signup));
router.post("/login", validateRequest(loginSchema), asyncHandler(login));
router.post("/forgot-password", validateRequest(forgotPasswordSchema), asyncHandler(forgotPassword));
router.post("/verify-otp", validateRequest(verifyOTPSchema), asyncHandler(verifyOTP));
router.post("/reset-password", validateRequest(resetPasswordSchema), asyncHandler(resetPassword));
router.post("/verify-user", validateRequest(verifyUserSchema), asyncHandler(verifyUser));

export default router;