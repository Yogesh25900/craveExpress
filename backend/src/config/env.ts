import dotenv from "dotenv";
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const env = {
  PORT:                   parseInt(process.env.PORT ?? "4000"),
  MONGODB_URI:            required("MONGODB_URI"),
  JWT_ACCESS_SECRET:      required("JWT_ACCESS_SECRET"),
  JWT_REFRESH_SECRET:     required("JWT_REFRESH_SECRET"),
  JWT_ACCESS_EXPIRES_IN:  process.env.JWT_ACCESS_EXPIRES_IN  ?? "15m",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  CLIENT_URL:             process.env.CLIENT_URL      ?? "http://localhost:3000",
  FRONTEND_ORIGIN:        process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
  NODE_ENV:               process.env.NODE_ENV  ?? "development",
  isProd:                 process.env.NODE_ENV  === "production",
  HCAPTCHA_SECRET:        process.env.HCAPTCHA_SECRET ?? "0x0000000000000000000000000000000000000000",
  MFA_ENCRYPTION_KEY:     process.env.MFA_ENCRYPTION_KEY ?? "a".repeat(64),
  CSRF_SECRET:            process.env.CSRF_SECRET ?? "dev-csrf-secret-not-for-production",
  PII_ENCRYPTION_KEY:     process.env.PII_ENCRYPTION_KEY ?? "b".repeat(64),
  GOOGLE_CLIENT_ID:       process.env.GOOGLE_CLIENT_ID     ?? "",
  GOOGLE_CLIENT_SECRET:   process.env.GOOGLE_CLIENT_SECRET ?? "",
  GOOGLE_CALLBACK_URL:    process.env.GOOGLE_CALLBACK_URL  ?? "http://localhost:4000/api/auth/oauth/google/callback",
  OAUTH_STATE_SECRET:     process.env.OAUTH_STATE_SECRET   ?? "dev-oauth-state-secret-not-for-production",
  get GOOGLE_OAUTH_ENABLED(): boolean {
    return Boolean(this.GOOGLE_CLIENT_ID && this.GOOGLE_CLIENT_SECRET);
  },
  ESEWA_PRODUCT_CODE:  process.env.ESEWA_PRODUCT_CODE  ?? "EPAYTEST",
  ESEWA_SECRET_KEY:    process.env.ESEWA_SECRET_KEY    ?? "8gBm/:&EnhH.1/q",
  ESEWA_FORM_URL:      process.env.ESEWA_FORM_URL      ?? "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
  ESEWA_STATUS_URL:    process.env.ESEWA_STATUS_URL    ?? "https://rc.esewa.com.np/api/epay/transaction/status/",
} as const;
