import { createLogger, format, transports } from "winston";
import path from "path";
import fs from "fs";
import type { Request } from "express";

const LOG_DIR = path.join(__dirname, "../../logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

export const SECURITY_LOG_PATH = path.join(LOG_DIR, "security.log");

// mask email
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 2) return `***@${email.slice(at + 1)}`;
  return `${email[0]}${email[1]}***@${email.slice(at + 1)}`;
}

// mask phone
export function maskPhone(phone: string): string {
  if (phone.length <= 4) return "***";
  const tail = phone.slice(-4);
  const prefix = phone.startsWith("+") ? phone.slice(0, 3) : "";
  return `${prefix}***${tail}`;
}

// get IP
export function getIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0].trim();
  return req.ip ?? req.socket?.remoteAddress ?? "unknown";
}

const winstonLogger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DDTHH:mm:ss.SSSZ" }),
    format.errors({ stack: true }),
    format.json(),
  ),
  transports: [
    new transports.File({
      filename: SECURITY_LOG_PATH,
      level: "info",
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
      tailable: true,
    }),
    new transports.File({
      filename: path.join(LOG_DIR, "error.log"),
      level: "error",
      maxsize: 10 * 1024 * 1024,
      maxFiles: 3,
      tailable: true,
    }),
    new transports.Console({
      format:
        process.env.NODE_ENV === "production"
          ? format.json()
          : format.combine(format.colorize(), format.simple()),
    }),
  ],
});

export type SecurityEvent =
  | "AUTH_SIGNUP"
  | "AUTH_LOGIN_SUCCESS"
  | "AUTH_LOGIN_FAIL"
  | "AUTH_ACCOUNT_LOCKED"
  | "AUTH_LOCKOUT_BLOCKED"
  | "AUTH_LOGOUT"
  | "AUTH_REFRESH"
  | "AUTH_REUSE_DETECTED"
  | "AUTH_MFA_REQUIRED"
  | "AUTH_MFA_LOGIN"
  | "AUTH_MFA_ENROLLED"
  | "AUTH_MFA_DISABLED"
  | "AUTH_PASSWORD_CHANGED"
  | "AUTH_OAUTH_LOGIN"
  | "AUTH_OAUTH_FAIL"
  | "ACCESS_DENIED"
  | "RATE_LIMIT_HIT"
  | "INTRUSION_SUSPECTED"
  | "INTRUSION_BLOCKED"
  | "PAYMENT_INITIATED"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "DATA_EXPORT";

export interface SecurityContext {
  req?:     Request;
  userId?:  string;
  email?:   string;
  reason?:  string;
  outcome?: string;
  [key: string]: unknown;
}

// security log
export function securityLog(event: SecurityEvent, ctx: SecurityContext = {}): void {
  const { req, email, ...rest } = ctx;

  const payload: Record<string, unknown> = { event, ...rest };

  if (req) {
    payload.ip     = getIp(req);
    payload.method = req.method;
    payload.path   = req.path;
  }

  if (email) payload.email = maskEmail(email);

  const isWarning =
    event === "AUTH_LOGIN_FAIL" ||
    event === "AUTH_ACCOUNT_LOCKED" ||
    event === "AUTH_LOCKOUT_BLOCKED" ||
    event === "AUTH_REUSE_DETECTED" ||
    event === "AUTH_OAUTH_FAIL" ||
    event === "ACCESS_DENIED" ||
    event === "RATE_LIMIT_HIT" ||
    event === "INTRUSION_SUSPECTED" ||
    event === "INTRUSION_BLOCKED" ||
    event === "PAYMENT_FAILED";

  winstonLogger[isWarning ? "warn" : "info"](payload);
}

// read audit log
export function getRecentSecurityEvents(limit = 100): Record<string, unknown>[] {
  try {
    if (!fs.existsSync(SECURITY_LOG_PATH)) return [];
    const lines = fs
      .readFileSync(SECURITY_LOG_PATH, "utf8")
      .split("\n")
      .filter(Boolean)
      .slice(-limit);
    return lines
      .map((line) => {
        try { return JSON.parse(line) as Record<string, unknown>; }
        catch { return null; }
      })
      .filter((e): e is Record<string, unknown> => e !== null)
      .reverse();
  } catch {
    return [];
  }
}

export default winstonLogger;
