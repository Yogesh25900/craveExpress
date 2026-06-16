import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AccessTokenPayload {
  userId: string;
  role: "user" | "admin" | "owner" | "rider";
  restaurantSlug?: string;   // present when role === "owner"
}

export interface RefreshTokenPayload {
  userId:    string;
  jti?:      string;    // JWT ID — present in all tokens issued after A5; absent in legacy tokens
  familyId?: string;    // shared across all rotations from one login session
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

export interface MfaPendingPayload {
  userId: string;
  mfaPending: true;
}

export function signMfaPendingToken(userId: string): string {
  return jwt.sign({ userId, mfaPending: true }, env.JWT_ACCESS_SECRET, { expiresIn: "5m" });
}

export function verifyMfaPendingToken(token: string): MfaPendingPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as MfaPendingPayload;
  if (!payload.mfaPending) throw new Error("Not an MFA pending token");
  return payload;
}
