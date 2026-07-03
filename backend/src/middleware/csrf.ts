import { randomBytes, createHmac, timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import { AppError } from "./errorHandler";

// issue CSRF token
export function issueCsrfToken(): string {
  const nonce = randomBytes(24).toString("base64url");
  const sig   = createHmac("sha256", env.CSRF_SECRET).update(nonce).digest("base64url");
  return `${nonce}.${sig}`;
}

// verify CSRF token
export function verifyCsrf(req: Request, _res: Response, next: NextFunction): void {
  const headerValue = req.headers["x-csrf-token"];

  if (!headerValue || typeof headerValue !== "string") {
    throw new AppError(403, "CSRF token missing — possible cross-site request forgery");
  }

  const dotIdx = headerValue.lastIndexOf(".");
  if (dotIdx === -1) throw new AppError(403, "Malformed CSRF token");

  const nonce = headerValue.slice(0, dotIdx);
  const sig   = headerValue.slice(dotIdx + 1);

  const expectedSig = createHmac("sha256", env.CSRF_SECRET).update(nonce).digest("base64url");

  let valid = false;
  try {
    valid = timingSafeEqual(
      Buffer.from(sig,         "base64url"),
      Buffer.from(expectedSig, "base64url"),
    );
  } catch { /* buffer length mismatch = definitely invalid */ }

  if (!valid) throw new AppError(403, "Invalid CSRF token");
  next();
}
