import { Schema, model, Document } from "mongoose";

export interface ICoupon extends Document {
  code: string;               // unique uppercase
  type: "percent" | "flat";
  value: number;
  minOrder: number;
  maxUses: number;            // 0 = unlimited
  usedCount: number;
  expiresAt: Date;
  isActive: boolean;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code:        { type: String, required: true, unique: true, uppercase: true, trim: true },
    type:        { type: String, enum: ["percent", "flat"], required: true },
    value:       { type: Number, required: true, min: 0 },
    minOrder:    { type: Number, default: 0, min: 0 },
    maxUses:     { type: Number, default: 0, min: 0 },   // 0 = unlimited
    usedCount:   { type: Number, default: 0, min: 0 },
    expiresAt:   { type: Date, required: true },
    isActive:    { type: Boolean, default: true },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

// `unique: true` on the `code` field creates an index automatically.

export const Coupon = model<ICoupon>("Coupon", couponSchema);
