import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

interface DecodedToken {
  id: number;
  role: string;
  iat?: number;
  exp?: number;
}

declare module "express" {
  interface Request {
    user?: DecodedToken;
  }
}

export const authorize = (roles: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing or malformed token" });
    }

    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;

      // Role check if roles are specified
      if (roles.length > 0 && !roles.includes(decoded.role)) {
        return res.status(403).json({ message: "Forbidden: insufficient role" });
      }

      req.user = decoded;
      next();
    } catch (err) {
      console.error("JWT verification failed:", err);
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
};
