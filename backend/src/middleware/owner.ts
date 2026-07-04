import type { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler";

export function requireOwner(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) throw new AppError(401, "Authentication required");
  if (req.user.role !== "owner" && req.user.role !== "admin") {
    throw new AppError(403, "Restaurant owner access required");
  }
  if (req.user.role === "owner" && !req.user.restaurantSlug) {
    throw new AppError(403, "No restaurant linked to this account");
  }
  next();
}
