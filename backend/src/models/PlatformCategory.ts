import { Schema, model, Document } from "mongoose";

export interface IPlatformCategory extends Document {
  slug:      string;
  name:      string;
  emoji:     string;
  sortOrder: number;
  isActive:  boolean;
}

const platformCategorySchema = new Schema<IPlatformCategory>(
  {
    slug:      { type: String, required: true, unique: true, lowercase: true, trim: true },
    name:      { type: String, required: true, trim: true },
    emoji:     { type: String, required: true },
    sortOrder: { type: Number, default: 0 },
    isActive:  { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const PlatformCategory = model<IPlatformCategory>("PlatformCategory", platformCategorySchema);
