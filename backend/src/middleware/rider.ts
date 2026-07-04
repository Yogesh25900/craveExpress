import type { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler";

export function requireRider(req: Request, _res: Response, next: NextFunction): void {
  const role = req.user?.role;
  if (role !== "rider" && role !== "admin") {
    throw new AppError(403, "Rider access required");
  }
  next();
}
