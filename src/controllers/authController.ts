import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { User } from "../entity/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

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
    role: role === "super_admin" ? "super_admin" : "user" // only allow predefined roles
  });

  await userRepo.save(user);

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });

  res.status(201).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
};

export const login = async (req: Request, res: Response): Promise<any> => {
  const { email, password } = req.body;

  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { email } });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });

  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
};
