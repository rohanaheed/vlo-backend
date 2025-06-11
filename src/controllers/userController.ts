import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { User } from "../entity/User";

export const getUsers = async (_req: Request, res: Response): Promise<any> => {
  const userRepo = AppDataSource.getRepository(User);
  const users = await userRepo.find();
  res.json(users);
};

export const createUser = async (req: Request, res: Response): Promise<any> => {
  const userRepo = AppDataSource.getRepository(User);
  const user = userRepo.create(req.body);
  const savedUser = await userRepo.save(user);
  res.status(201).json(savedUser);
};
