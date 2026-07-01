import { Schema, model, Document, Types } from "mongoose";

export interface IAddon {
  _id: Types.ObjectId;
  name: string;
  price: number;
}

export interface IMenuItem extends Document {
  restaurantId: Types.ObjectId;
  restaurantSlug: string;     // denormalised for fast filtering
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;           // matches MenuCategory.id
  isPopular: boolean;
  isVeg: boolean;
  isAvailable: boolean;
  addons: IAddon[];
  createdAt: Date;
  updatedAt: Date;
}

const addonSchema = new Schema<IAddon>(
  {
    name:  { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const menuItemSchema = new Schema<IMenuItem>(
  {
    restaurantId:   { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    restaurantSlug: { type: String, required: true },
    name:           { type: String, required: true, trim: true },
    description:    { type: String, default: "" },
    price:          { type: Number, required: true, min: 0 },
    image:          { type: String, required: true },
    category:       { type: String, required: true },
    isPopular:      { type: Boolean, default: false },
    isVeg:          { type: Boolean, default: false },
    isAvailable:    { type: Boolean, default: true },
    addons:         [addonSchema],
  },
  { timestamps: true }
);

menuItemSchema.index({ restaurantId: 1, category: 1 });
menuItemSchema.index({ restaurantSlug: 1 });

export const MenuItem = model<IMenuItem>("MenuItem", menuItemSchema);
