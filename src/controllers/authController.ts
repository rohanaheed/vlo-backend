import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { User } from "../entity/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { generateOTP, sendOTPEmail, sendPasswordResetSuccessEmail } from "../utils/emailUtils";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret"; // move to env file in production

export const signup = async (req: Request, res: Response): Promise<any> => {
  const { name, email, password, role } = req.body;

  const userRepo = AppDataSource.getRepository(User);
  const existingUser = await userRepo.findOne({ where: { email } });
  if (existingUser) return res.status(400).json({ message: "Email already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = userRepo.create({
    name,
    email,
    password: hashedPassword,
    role: role === "super_admin" ? "super_admin" : "user", // only allow predefined roles
    isDelete: false,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  await userRepo.save(user);

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });

  res.status(201).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isDelete: user.isDelete,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  });
};

export const login = async (req: Request, res: Response): Promise<any> => {
  const { email, password } = req.body;

  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { email } });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  // ❌ If user is marked as deleted
  if (user.isDelete) {
    return res.status(403).json({ message: "Account has been deactivated" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });

  res.json({ token, user });
};

// Forgot password - Send OTP
export const forgotPassword = async (req: Request, res: Response): Promise<any> => {
  const { email } = req.body;

  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { email, isDelete: false } });

  if (!user) {
    return res.status(404).json({ message: "User not found with this email address" });
  }

  // Generate OTP
  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  // Save OTP to user
  user.otp = otp;
  user.otpExpiry = otpExpiry;
  await userRepo.save(user);

  // Send OTP email
  const emailSent = await sendOTPEmail(email, otp, user.name);

  if (!emailSent) {
    return res.status(500).json({ message: "Failed to send OTP email. Please try again." });
  }

  res.json({ 
    message: "OTP sent successfully to your email address",
    email: email // Return email for frontend reference
  });
};

// Verify OTP
export const verifyOTP = async (req: Request, res: Response): Promise<any> => {
  const { email, otp } = req.body;

  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { email, isDelete: false } });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Check if OTP exists and is not expired
  if (!user.otp || !user.otpExpiry) {
    return res.status(400).json({ message: "No OTP found. Please request a new OTP." });
  }

  if (new Date() > user.otpExpiry) {
    // Clear expired OTP
    user.otp = null;
    user.otpExpiry = null;
    await userRepo.save(user);
    return res.status(400).json({ message: "OTP has expired. Please request a new OTP." });
  }

  // Verify OTP
  if (user.otp !== otp) {
    return res.status(400).json({ message: "Invalid OTP. Please check and try again." });
  }

  // OTP is valid - clear it and return success
  user.otp = null;
  user.otpExpiry = null;
  await userRepo.save(user);

  res.json({ 
    message: "OTP verified successfully",
    email: email
  });
};

// Reset password
export const resetPassword = async (req: Request, res: Response): Promise<any> => {
  const { email, otp, newPassword } = req.body;

  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { email, isDelete: false } });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Check if OTP exists and is not expired
  if (!user.otp || !user.otpExpiry) {
    return res.status(400).json({ message: "No OTP found. Please request a new OTP." });
  }

  if (new Date() > user.otpExpiry) {
    // Clear expired OTP
    user.otp = null;
    user.otpExpiry = null;
    await userRepo.save(user);
    return res.status(400).json({ message: "OTP has expired. Please request a new OTP." });
  }

  // Verify OTP
  if (user.otp !== otp) {
    return res.status(400).json({ message: "Invalid OTP. Please check and try again." });
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password and clear OTP
  user.password = hashedPassword;
  user.otp = null;
  user.otpExpiry = null;
  await userRepo.save(user);

  // Send success email
  await sendPasswordResetSuccessEmail(email, user.name);

  res.json({ 
    message: "Password reset successfully. You can now login with your new password."
  });
};
