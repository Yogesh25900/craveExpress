import { Schema, model, Document } from "mongoose";

export interface IPlatformSettings extends Document {
  key: "global";              // singleton — always "global"
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  defaultDeliveryFee: number;
  defaultMinOrder: number;
  commissionRate: number;     // percentage e.g. 15
  maintenanceMode: boolean;
  allowGuestCheckout: boolean;
  maxDeliveryRadius: number;  // km
  updatedAt: Date;
}

const platformSettingsSchema = new Schema<IPlatformSettings>(
  {
    key:                { type: String, default: "global", unique: true },
    platformName:       { type: String, default: "CraveExpress" },
    supportEmail:       { type: String, default: "support@craveexpress.com" },
    supportPhone:       { type: String, default: "+1 (800) 555-CRAVE" },
    defaultDeliveryFee: { type: Number, default: 2.99 },
    defaultMinOrder:    { type: Number, default: 10 },
    commissionRate:     { type: Number, default: 15 },
    maintenanceMode:    { type: Boolean, default: false },
    allowGuestCheckout: { type: Boolean, default: true },
    maxDeliveryRadius:  { type: Number, default: 10 },
  },
  { timestamps: true }
);

export const PlatformSettings = model<IPlatformSettings>("PlatformSettings", platformSettingsSchema);
