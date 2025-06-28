import { Router } from "express";
import { signup, login, forgotPassword, verifyOTP, resetPassword } from "../controllers/authController";
import { validateRequest } from "../middleware/validateRequest";
import { signupSchema, loginSchema, forgotPasswordSchema, verifyOTPSchema, resetPasswordSchema } from "../utils/validators/inputValidator";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.post("/signup", validateRequest(signupSchema), asyncHandler(signup));
router.post("/login", validateRequest(loginSchema), asyncHandler(login));

// Forgot password routes
router.post("/forgot-password", validateRequest(forgotPasswordSchema), asyncHandler(forgotPassword));
router.post("/verify-otp", validateRequest(verifyOTPSchema), asyncHandler(verifyOTP));
router.post("/reset-password", validateRequest(resetPasswordSchema), asyncHandler(resetPassword));

export default router;