import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { generateSecret, verify } from "otplib";
import bcrypt from "bcryptjs";
import { env } from "../config/env";

const ALGORITHM = "aes-256-gcm";

function keyBuffer(): Buffer {
  return Buffer.from(env.MFA_ENCRYPTION_KEY, "hex");
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, keyBuffer(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), enc.toString("hex")].join(":");
}

export function decryptSecret(ciphertext: string): string {
  const [ivHex, tagHex, encHex] = ciphertext.split(":");
  const iv  = Buffer.from(ivHex,  "hex");
  const tag = Buffer.from(tagHex, "hex");
  const enc = Buffer.from(encHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, keyBuffer(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // avoids I/O/0/1 confusion

function randomCode(): string {
  const bytes = randomBytes(10);
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += CODE_CHARS[bytes[i] % CODE_CHARS.length];
    if (i === 4) result += "-";
  }
  return result;
}

export function generateRecoveryCodes(): string[] {
  return Array.from({ length: 8 }, randomCode);
}

export async function hashRecoveryCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

export async function findAndConsumeRecoveryCode(
  plainCode: string,
  hashes: string[]
): Promise<{ index: number } | null> {
  for (let i = 0; i < hashes.length; i++) {
    const match = await bcrypt.compare(plainCode, hashes[i]);
    if (match) return { index: i };
  }
  return null;
}

export async function verifyTotp(secret: string, token: string): Promise<boolean> {
  try {
    const result = await verify({ secret, token });
    return typeof result === "object" ? result.valid : Boolean(result);
  } catch {
    return false;
  }
}

export function generateTotpSecret(): string {
  return generateSecret();
}

export function totpKeyUri(email: string, secret: string): string {
  const label = encodeURIComponent(`CraveExpress:${email}`);
  const issuer = encodeURIComponent("CraveExpress");
  return `otpauth://totp/${label}?secret=${encodeURIComponent(secret)}&issuer=${issuer}`;
}
