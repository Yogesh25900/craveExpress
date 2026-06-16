import { rateLimit } from "express-rate-limit";
import type { Request, Response } from "express";
import { securityLog, getIp } from "../lib/logger";

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many requests — please try again later." },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many authentication attempts — please try again in 15 minutes." },
  skipSuccessfulRequests: true,
  handler(req: Request, res: Response) {
    securityLog("RATE_LIMIT_HIT", { req, ip: getIp(req), limiter: "auth" });
    res.status(429).json({ success: false, message: "Too many authentication attempts — please try again in 15 minutes." });
  },
});
