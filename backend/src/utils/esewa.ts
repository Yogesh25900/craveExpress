import crypto from "crypto";
import { env } from "../config/env";

// ── eSewa ePay v2 integration ─────────────────────────────────────────────────
// eSewa is Nepal's leading digital wallet / payment gateway. This module implements
// the ePay v2 HMAC-SHA256 signed form flow against the developer sandbox.
//
// Trust model: eSewa signs every request and callback with a shared secret. We
// re-derive the HMAC and compare in constant time, so a forged success callback
// cannot mark an order paid. The order total is signed, preventing amount tampering.
//
// Docs: https://developer.esewa.com.np/pages/Epay#integration

// The signature is HMAC-SHA256(base64) over a comma-joined "key=value" message
// whose field order MUST match signed_field_names exactly.
export function signEsewa(fields: Record<string, string | number>, signedFieldNames: string): string {
  const message = signedFieldNames
    .split(",")
    .map((k) => `${k}=${fields[k.trim()]}`)
    .join(",");
  return crypto.createHmac("sha256", env.ESEWA_SECRET_KEY).update(message).digest("base64");
}

// Build the exact set of hidden form fields the browser POSTs to eSewa.
export function buildEsewaForm(params: {
  transactionUuid: string;
  totalAmount: number;
  successUrl: string;
  failureUrl: string;
}) {
  const signedFieldNames = "total_amount,transaction_uuid,product_code";
  const base = {
    amount:                  params.totalAmount,
    tax_amount:              0,
    total_amount:            params.totalAmount,
    transaction_uuid:        params.transactionUuid,
    product_code:            env.ESEWA_PRODUCT_CODE,
    product_service_charge:  0,
    product_delivery_charge: 0,
    success_url:             params.successUrl,
    failure_url:             params.failureUrl,
    signed_field_names:      signedFieldNames,
  };
  const signature = signEsewa(base, signedFieldNames);
  return {
    action: env.ESEWA_FORM_URL,
    fields: { ...base, signature } as Record<string, string | number>,
  };
}

// eSewa redirects to success_url with a base64-encoded JSON `data` param.
// Decode it and re-verify the HMAC over the fields eSewa says it signed.
export interface EsewaCallback {
  transaction_code: string;
  status: string;
  total_amount: string;
  transaction_uuid: string;
  product_code: string;
  signed_field_names: string;
  signature: string;
}

export function decodeEsewaCallback(dataB64: string): EsewaCallback | null {
  try {
    return JSON.parse(Buffer.from(dataB64, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

export function verifyEsewaCallback(cb: EsewaCallback): boolean {
  // eSewa returns total_amount possibly with thousands separators / spaces — normalise.
  const normalised: Record<string, string> = {
    ...cb,
    total_amount: String(cb.total_amount).replace(/[,\s]/g, ""),
  };
  const expected = signEsewa(normalised, cb.signed_field_names);
  if (expected.length !== cb.signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(cb.signature));
}

// Server-to-server status verification — the authoritative source of truth.
// Never trust the browser redirect alone; confirm the transaction directly with eSewa.
export async function checkEsewaStatus(transactionUuid: string, totalAmount: number): Promise<string> {
  const url = new URL(env.ESEWA_STATUS_URL);
  url.searchParams.set("product_code", env.ESEWA_PRODUCT_CODE);
  url.searchParams.set("total_amount", String(totalAmount));
  url.searchParams.set("transaction_uuid", transactionUuid);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url.toString(), { signal: ctrl.signal });
    if (!res.ok) return "UNKNOWN";
    const body = (await res.json()) as { status?: string };
    return body.status ?? "UNKNOWN"; // COMPLETE | PENDING | FULL_REFUND | CANCELED | NOT_FOUND | AMBIGUOUS
  } catch {
    return "UNKNOWN";
  } finally {
    clearTimeout(timer);
  }
}
