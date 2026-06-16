import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { env } from "../config/env";

// AES-256-GCM field-level encryption for PII (phone, address fields).
// Stored format:  enc:<iv_hex>:<authTag_hex>:<ciphertext_hex>
// The "enc:" prefix is the detection sentinel — no real phone/address value starts with it.

const ALGORITHM = "aes-256-gcm";
const PREFIX    = "enc:";

function keyBuffer(): Buffer {
  return Buffer.from(env.PII_ENCRYPTION_KEY, "hex");
}

export function encryptPii(plaintext: string): string {
  const iv     = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, keyBuffer(), iv);
  const enc    = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag    = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptPii(ciphertext: string): string {
  const body           = ciphertext.slice(PREFIX.length);
  const [ivHex, tagHex, encHex] = body.split(":");
  const iv    = Buffer.from(ivHex,  "hex");
  const tag   = Buffer.from(tagHex, "hex");
  const enc   = Buffer.from(encHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, keyBuffer(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

export function isEncryptedPii(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

export function encryptIfNeeded(value: string): string {
  return isEncryptedPii(value) ? value : encryptPii(value);
}

export function safeDecryptPii(value: string | null | undefined): string {
  if (!value) return value ?? "";
  return isEncryptedPii(value) ? decryptPii(value) : value;
}
