import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { securityLog } from "../lib/logger";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public data?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: err.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
    return;
  }

  // JWT errors
  if (err instanceof TokenExpiredError) {
    res.status(401).json({ success: false, message: "Token expired" });
    return;
  }
  if (err instanceof JsonWebTokenError) {
    res.status(401).json({ success: false, message: "Invalid token" });
    return;
  }

  // Mongoose duplicate key
  if ((err as NodeJS.ErrnoException).name === "MongoServerError" &&
      (err as { code?: number }).code === 11000) {
    res.status(409).json({ success: false, message: "Already exists" });
    return;
  }

  // App errors (known, intentional)
  if (err instanceof AppError) {
    if (err.statusCode === 401 || err.statusCode === 403) {
      securityLog("ACCESS_DENIED", {
        req,
        userId: req.user?.userId,
        reason:  err.message,
        outcome: err.statusCode === 403 ? "forbidden" : "unauthenticated",
      });
    }
    res.status(err.statusCode).json({ success: false, message: err.message, ...(err.data ?? {}) });
    return;
  }

  // Unknown errors
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
}
