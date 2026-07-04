import type { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler";

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) throw new AppError(401, "Authentication required");
  if (req.user.role !== "admin") throw new AppError(403, "Admin access required");
  next();
}
