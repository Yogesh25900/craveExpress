import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import { env } from "./config/env";
import { connectDB } from "./config/db";
import { errorHandler } from "./middleware/errorHandler";
import { globalLimiter } from "./middleware/rateLimiter";
import { intrusionDetection } from "./middleware/intrusionDetection";
import router from "./routes";
import logger from "./lib/logger";

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  frameguard: { action: "deny" },
  noSniff: true,
  hsts: env.isProd
    ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
    : false,
  referrerPolicy: { policy: "no-referrer" },
  hidePoweredBy: true,
}));

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || origin === env.FRONTEND_ORIGIN) return cb(null, true);
    cb(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "Cache-Control", "X-Requested-With", "X-CSRF-Token"],
  exposedHeaders: ["Retry-After", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
}));

app.use(globalLimiter);
app.use(morgan(env.isProd ? "combined" : "dev", {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(mongoSanitize({
  onSanitize: ({ req, key }) => {
    logger.warn({
      event: "NOSQL_INJECTION_BLOCKED",
      ip:    req.ip,
      path:  req.path,
      key,
    });
  },
}));
app.use(hpp());

app.use(intrusionDetection);

app.use("/api", router);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", env: env.NODE_ENV, ts: new Date().toISOString() });
});

app.use(errorHandler);

// start server
async function start() {
  await connectDB();
  app.listen(env.PORT, () => {
    logger.info({ event: "SERVER_START", port: env.PORT, env: env.NODE_ENV });
  });
}

start().catch((err) => {
  logger.error({ event: "SERVER_FATAL", error: String(err) });
  process.exit(1);
});
