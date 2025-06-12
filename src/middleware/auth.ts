import { RequestHandler } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your_secret";

export const authorize = (roles?: string[]): RequestHandler => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized" });
      return; // <== ✅ Return void here
    }

    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string };

      (req as any).user = decoded;

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
