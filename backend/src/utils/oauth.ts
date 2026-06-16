import { randomBytes, createHmac, timingSafeEqual } from "crypto";
import { env } from "../config/env";

// ── Google OAuth2 (Authorization Code flow) ─────────────────────────────────
// No SDK dependency — we talk to Google's documented endpoints with fetch, and
// protect the round-trip with a stateless HMAC-signed `state` parameter.

const GOOGLE_AUTH_URL  = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO  = "https://www.googleapis.com/oauth2/v3/userinfo";

const STATE_TTL_MS = 10 * 60 * 1000;  // OAuth redirect must complete within 10 minutes

export interface GoogleProfile {
  sub:            string;   // stable Google user id
  email:          string;
  email_verified: boolean;
  name?:          string;
  picture?:       string;
}

// ── Signed state — CSRF protection for the redirect ─────────────────────────
// Format: <base64url({n,t})>.<base64url-hmac>

export function issueOAuthState(): string {
  const payload = Buffer.from(
    JSON.stringify({ n: randomBytes(16).toString("hex"), t: Date.now() })
  ).toString("base64url");
  const sig = createHmac("sha256", env.OAUTH_STATE_SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyOAuthState(state: string | undefined): boolean {
  if (!state || typeof state !== "string") return false;
  const dot = state.lastIndexOf(".");
  if (dot === -1) return false;

  const payload = state.slice(0, dot);
  const sig     = state.slice(dot + 1);
  const expected = createHmac("sha256", env.OAUTH_STATE_SECRET).update(payload).digest("base64url");

  let valid = false;
  try {
    valid = timingSafeEqual(Buffer.from(sig, "base64url"), Buffer.from(expected, "base64url"));
  } catch { /* length mismatch = invalid */ }
  if (!valid) return false;

  try {
    const { t } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { t: number };
    return typeof t === "number" && Date.now() - t < STATE_TTL_MS;
  } catch {
    return false;
  }
}

// ── Build the consent-screen URL ────────────────────────────────────────────
export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id:     env.GOOGLE_CLIENT_ID,
    redirect_uri:  env.GOOGLE_CALLBACK_URL,
    response_type: "code",
    scope:         "openid email profile",
    state,
    access_type:   "online",
    prompt:        "select_account",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

// ── Exchange the authorization code for the user's Google profile ───────────
export async function fetchGoogleProfile(code: string): Promise<GoogleProfile> {
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri:  env.GOOGLE_CALLBACK_URL,
      grant_type:    "authorization_code",
    }).toString(),
  });

  if (!tokenRes.ok) throw new Error(`Google token exchange failed (${tokenRes.status})`);
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) throw new Error("Google token response missing access_token");

  const infoRes = await fetch(GOOGLE_USERINFO, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!infoRes.ok) throw new Error(`Google userinfo failed (${infoRes.status})`);

  const profile = (await infoRes.json()) as GoogleProfile;
  if (!profile.sub || !profile.email) throw new Error("Google profile missing sub/email");
  return profile;
}
