import { Schema, model, Document, Types } from "mongoose";
import { encryptIfNeeded, safeDecryptPii } from "../utils/pii";

export interface IAddress {
  _id: Types.ObjectId;
  label: string;    // "Home" | "Work" | "Other"
  street: string;
  city: string;
  zip: string;
}

export interface IUser extends Document {
  fullName: string;
  email: string;
  password?: string;  // bcrypt hash — absent for SSO-only accounts
  phone: string;
  avatar?: string;
  authProvider: "local" | "google";  // how the account signs in
  googleId?: string;                  // Google 'sub' — set for google accounts
  role: "user" | "admin" | "owner" | "rider";
  restaurantId?: Types.ObjectId;   // owner only
  restaurantSlug?: string;         // owner only — denormalised for JWT
  isBanned: boolean;
  isOnline: boolean;               // rider only — availability toggle
  addresses: IAddress[];
  passwordHistory: string[];       // last 5 bcrypt hashes — never returned to client
  passwordChangedAt?: Date;
  failedLoginAttempts: number;
  lockUntil?: Date;
  mfaEnabled: boolean;
  mfaSecret?: string;              // encrypted TOTP secret
  mfaTempSecret?: string;          // temp during enrollment — not yet activated
  recoveryCodes: string[];         // bcrypt hashes of one-time recovery codes
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<IAddress>(
  {
    label:  { type: String, required: true, default: "Home" },
    street: { type: String, required: true },
    city:   { type: String, required: true },
    zip:    { type: String, required: true },
  },
  { _id: true }
);

const userSchema = new Schema<IUser>(
  {
    fullName:       { type: String, required: true, trim: true },
    email:          { type: String, required: true, unique: true, lowercase: true, trim: true },
    // password required only for local accounts; SSO accounts authenticate via their provider
    password:       { type: String, required(this: IUser) { return this.authProvider === "local"; } },
    // phone unknown for SSO signups until the user fills their profile
    phone:          { type: String, required(this: IUser) { return this.authProvider === "local"; }, trim: true, default: "" },
    avatar:         { type: String },
    authProvider:   { type: String, enum: ["local", "google"], default: "local" },
    googleId:       { type: String, index: true, sparse: true },
    role:           { type: String, enum: ["user", "admin", "owner", "rider"], default: "user" },
    restaurantId:   { type: Schema.Types.ObjectId, ref: "Restaurant" },
    restaurantSlug: { type: String },
    isBanned:         { type: Boolean, default: false },
    isOnline:         { type: Boolean, default: false },
    addresses:        [addressSchema],
    passwordHistory:      { type: [String], default: [], select: false },
    passwordChangedAt:    { type: Date },
    failedLoginAttempts:  { type: Number, default: 0 },
    lockUntil:            { type: Date },
    mfaEnabled:           { type: Boolean, default: false },
    mfaSecret:            { type: String, select: false },
    mfaTempSecret:        { type: String, select: false },
    recoveryCodes:        { type: [String], default: [], select: false },
  },
  { timestamps: true }
);

// ── PII encryption hooks ─────────────────────────────────────────────────────

function encryptUserPii(doc: IUser): void {
  if (doc.phone)     doc.phone = encryptIfNeeded(doc.phone);
  if (doc.addresses) {
    for (const addr of doc.addresses) {
      if (addr.street) addr.street = encryptIfNeeded(addr.street);
      if (addr.city)   addr.city   = encryptIfNeeded(addr.city);
      if (addr.zip)    addr.zip    = encryptIfNeeded(addr.zip);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function decryptUserPii(doc: any): void {
  if (!doc) return;
  if (doc.phone)     doc.phone = safeDecryptPii(doc.phone);
  if (Array.isArray(doc.addresses)) {
    for (const addr of doc.addresses) {
      if (addr.street) addr.street = safeDecryptPii(addr.street);
      if (addr.city)   addr.city   = safeDecryptPii(addr.city);
      if (addr.zip)    addr.zip    = safeDecryptPii(addr.zip);
    }
  }
}

// Encrypt before every save
userSchema.pre("save", function () {
  encryptUserPii(this as unknown as IUser);
});

// Decrypt after every save so the in-memory document stays readable
userSchema.post("save", function (doc: unknown) { decryptUserPii(doc); });

// Decrypt after every find/findOne (handles lean + non-lean results)
userSchema.post("find",      function (docs: unknown[]) { docs.forEach(decryptUserPii); });
userSchema.post("findOne",   function (doc:  unknown)   { decryptUserPii(doc); });
userSchema.post("findOneAndUpdate", function (doc: unknown) { decryptUserPii(doc); });

userSchema.set("toJSON", {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform(_doc: unknown, ret: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    delete ret.password;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return ret;
  },
});

export const User = model<IUser>("User", userSchema);
