import { Request, RequestHandler, Response } from "express";
import { NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../config/db";
import { User } from "../entity/User";

const JWT_SECRET = process.env.JWT_SECRET || "your_secret";

export const authorize = (roles?: string[]): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized" });
      return; // <== ✅ Return void here
    }

    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string };

      // Get user from database by id
      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOne({ where: { id: decoded.id } });

      if (!user) {
        res.status(401).json({ message: "User not found" });
        return;
      }

      // Check if user is deleted
      if (user.isDelete) {
        res.status(403).json({ message: "Account has been deactivated" });
        return;
      }

      // Add user object to request
      (req as any).user = user;

      if (roles && !roles.includes(decoded.role)) {
        res.status(403).json({ message: "Forbidden: insufficient role" });
        return; // <== ✅ Return void
      }

      next(); // <== ✅ Only next() if authorized
    } catch (err) {
      res.status(401).json({ message: "Invalid token" });
    }
  };
};
