/**
 * One-time migration: encrypt existing plaintext PII in MongoDB.
 *
 * Safe to re-run — already-encrypted fields are detected by the "enc:" prefix
 * and skipped. New IV is generated on each encryption so running twice produces
 * different ciphertexts, but both are valid (different IVs, same plaintext).
 *
 * Run with:
 *   npx ts-node -r tsconfig-paths/register scripts/migrate-pii.ts
 *
 * Requires MONGODB_URI and PII_ENCRYPTION_KEY in the environment (.env).
 */

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { env } from "../src/config/env";
import { encryptPii, isEncryptedPii } from "../src/utils/pii";

async function main(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI);
  console.log("Connected to MongoDB");

  // Use raw collection access to bypass Mongoose hooks so we see raw stored values
  const db = mongoose.connection.db!;

  // ── Users ────────────────────────────────────────────────────────────────────
  const users = await db.collection("users").find({}).toArray();
  let usersMigrated = 0;

  for (const u of users) {
    const $set: Record<string, unknown> = {};

    // Phone
    if (u.phone && typeof u.phone === "string" && !isEncryptedPii(u.phone)) {
      $set.phone = encryptPii(u.phone);
    }

    // Addresses array — rebuild each subdoc with encrypted fields
    if (Array.isArray(u.addresses) && u.addresses.length > 0) {
      const encryptedAddresses = u.addresses.map((addr: Record<string, string>) => ({
        ...addr,
        street: addr.street && !isEncryptedPii(addr.street) ? encryptPii(addr.street) : (addr.street ?? ""),
        city:   addr.city   && !isEncryptedPii(addr.city)   ? encryptPii(addr.city)   : (addr.city   ?? ""),
        zip:    addr.zip    && !isEncryptedPii(addr.zip)    ? encryptPii(addr.zip)    : (addr.zip    ?? ""),
      }));

      const hasChanges = encryptedAddresses.some(
        (enc: Record<string, string>, i: number) =>
          enc.street !== u.addresses[i].street ||
          enc.city   !== u.addresses[i].city   ||
          enc.zip    !== u.addresses[i].zip
      );
      if (hasChanges) $set.addresses = encryptedAddresses;
    }

    if (Object.keys($set).length > 0) {
      await db.collection("users").updateOne({ _id: u._id }, { $set });
      usersMigrated++;
    }
  }

  console.log(`Users:  ${usersMigrated} / ${users.length} migrated`);

  // ── Orders ───────────────────────────────────────────────────────────────────
  const orders = await db.collection("orders").find({}).toArray();
  let ordersMigrated = 0;

  for (const o of orders) {
    const $set: Record<string, unknown> = {};

    // Delivery address
    if (o.address) {
      const a = o.address as Record<string, string>;
      const encAddr: Record<string, string> = { ...a };
      let addrChanged = false;
      if (a.street && !isEncryptedPii(a.street)) { encAddr.street = encryptPii(a.street); addrChanged = true; }
      if (a.city   && !isEncryptedPii(a.city))   { encAddr.city   = encryptPii(a.city);   addrChanged = true; }
      if (a.zip    && !isEncryptedPii(a.zip))     { encAddr.zip    = encryptPii(a.zip);    addrChanged = true; }
      if (addrChanged) $set.address = encAddr;
    }

    // Rider phone
    if (o.riderPhone && typeof o.riderPhone === "string" && !isEncryptedPii(o.riderPhone)) {
      $set.riderPhone = encryptPii(o.riderPhone);
    }

    if (Object.keys($set).length > 0) {
      await db.collection("orders").updateOne({ _id: o._id }, { $set });
      ordersMigrated++;
    }
  }

  console.log(`Orders: ${ordersMigrated} / ${orders.length} migrated`);

  await mongoose.disconnect();
  console.log("Migration complete.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
