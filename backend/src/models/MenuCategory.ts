import { Schema, model, Document, Types } from "mongoose";

export interface IMenuCategory extends Document {
  restaurantId:   Types.ObjectId;
  restaurantSlug: string;
  name:           string;
  sortOrder:      number;
  createdAt:      Date;
  updatedAt:      Date;
}

const menuCategorySchema = new Schema<IMenuCategory>(
  {
    restaurantId:   { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    restaurantSlug: { type: String, required: true },
    name:           { type: String, required: true, trim: true },
    sortOrder:      { type: Number, default: 0 },
  },
  { timestamps: true }
);

menuCategorySchema.index({ restaurantSlug: 1, sortOrder: 1 });

export const MenuCategory = model<IMenuCategory>("MenuCategory", menuCategorySchema);
