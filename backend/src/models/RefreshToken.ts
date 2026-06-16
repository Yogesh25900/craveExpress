import { Schema, model, Document, Types } from "mongoose";

export interface IRefreshToken extends Document {
  jti:       string;           // UUID — matches jwt payload.jti; unique per issued token
  familyId:  string;           // UUID — all rotations from one login share this
  userId:    Types.ObjectId;
  used:      boolean;          // true once this token has been exchanged for a new one
  revoked:   boolean;          // true if family is compromised or user explicitly logged out
  expiresAt: Date;             // TTL index — MongoDB auto-deletes after expiry
  createdAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    jti:      { type: String, required: true, unique: true },
    familyId: { type: String, required: true, index: true },
    userId:   { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    used:     { type: Boolean, default: false },
    revoked:  { type: Boolean, default: false },
    expiresAt:{ type: Date, required: true },
  },
  { timestamps: true }
);

// TTL index: MongoDB automatically removes documents after expiresAt
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = model<IRefreshToken>("RefreshToken", refreshTokenSchema);
