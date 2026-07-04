import type { Request, Response, NextFunction } from "express";
import { securityLog, getIp } from "../lib/logger";

interface IpState {
  score:        number;
  windowStart:  number;
  blockedUntil: number;
}

const WINDOW_MS      = 10 * 60 * 1000;
const BLOCK_MS       = 15 * 60 * 1000;
const SCORE_LIMIT    = 12;
const SIGNATURE_HIT  = 5;
const ERROR_HIT      = 1;

const ipStates = new Map<string, IpState>();

const sweep = setInterval(() => {
  const now = Date.now();
  for (const [ip, s] of ipStates) {
    if (now - s.windowStart > WINDOW_MS && now > s.blockedUntil) ipStates.delete(ip);
  }
}, WINDOW_MS);
sweep.unref?.();

const SIGNATURES: { name: string; re: RegExp }[] = [
  { name: "path_traversal",   re: /(\.\.[/\\]){2,}|%2e%2e[/\\]|\/etc\/passwd|\bboot\.ini\b/i },
  { name: "sql_injection",    re: /\b(union\s+select|select\s+.*\s+from\s|insert\s+into\s|drop\s+table|or\s+1\s*=\s*1|';--|\bsleep\s*\()/i },
  { name: "nosql_operator",   re: /\$where|\$ne\b|\$gt\b|\$regex\b|\{\s*"\$/i },
  { name: "xss_payload",      re: /<script\b|javascript:|onerror\s*=|onload\s*=|<iframe\b/i },
  { name: "command_injection",re: /;\s*(cat|ls|rm|wget|curl|nc|bash|sh)\s|\$\(|`.*`|\|\s*(cat|ls|id|whoami)\b/i },
];

function scan(haystack: string): string | null {
  for (const sig of SIGNATURES) {
    if (sig.re.test(haystack)) return sig.name;
  }
  return null;
}

function getState(ip: string): IpState {
  const now = Date.now();
  let s = ipStates.get(ip);
  if (!s || now - s.windowStart > WINDOW_MS) {
    s = { score: 0, windowStart: now, blockedUntil: s?.blockedUntil ?? 0 };
    ipStates.set(ip, s);
  }
  return s;
}

function addScore(ip: string, amount: number): number {
  const s = getState(ip);
  s.score += amount;
  if (s.score >= SCORE_LIMIT && s.blockedUntil < Date.now()) {
    s.blockedUntil = Date.now() + BLOCK_MS;
  }
  return s.blockedUntil;
}

// intrusion detection
export function intrusionDetection(req: Request, res: Response, next: NextFunction): void {
  const ip = getIp(req);
  const now = Date.now();

  const state = ipStates.get(ip);
  if (state && state.blockedUntil > now) {
    const mins = Math.ceil((state.blockedUntil - now) / 60000);
    securityLog("INTRUSION_BLOCKED", { req, ip, reason: "ip_temporarily_blocked", minsRemaining: mins });
    res.status(403).json({ success: false, message: "Request blocked. Try again later." });
    return;
  }

  const parts = [req.originalUrl];
  try { parts.push(decodeURIComponent(req.originalUrl)); } catch { /* malformed encoding — original still scanned */ }
  if (req.body && typeof req.body === "object") {
    try { parts.push(JSON.stringify(req.body)); } catch { /* circular/unserialisable — skip */ }
  }
  const match = scan(parts.join(" "));
  if (match) {
    const blockedUntil = addScore(ip, SIGNATURE_HIT);
    if (blockedUntil > now) {
      securityLog("INTRUSION_BLOCKED", { req, ip, signature: match, reason: "signature_threshold" });
      res.status(403).json({ success: false, message: "Request blocked." });
      return;
    }
    securityLog("INTRUSION_SUSPECTED", { req, ip, signature: match });
  }

  res.on("finish", () => {
    if (res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 404) {
      const blockedUntil = addScore(ip, ERROR_HIT);
      if (blockedUntil > Date.now()) {
        securityLog("INTRUSION_BLOCKED", { req, ip, reason: "anomalous_error_rate", status: res.statusCode });
      }
    }
  });

  next();
}
