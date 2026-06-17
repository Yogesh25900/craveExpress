import { Schema, model, Document } from "mongoose";

export interface IGeoPoint {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

export interface IRestaurant extends Document {
  slug: string;          // URL-friendly id matching Phase 1 frontend (e.g. "burger-joint")
  name: string;
  image: string;
  banner: string;
  cuisineTypes: string[];
  category: string;
  rating: number;
  reviewCount: number;
  deliveryTime: string;  // "20-30 min"
  deliveryFee: number;
  minOrder: number;
  isOpen: boolean;
  isActive: boolean;     // admin soft-delete
  address: string;
  phone?: string;
  location?: IGeoPoint;  // GeoJSON point — optional so existing docs without coords still work
  deliveryRadius: number; // km — max distance restaurant delivers to
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const restaurantSchema = new Schema<IRestaurant>(
  {
    slug:         { type: String, required: true, unique: true, lowercase: true, trim: true },
    name:         { type: String, required: true, trim: true },
    image:        { type: String, required: true },
    banner:       { type: String, required: true },
    cuisineTypes: [{ type: String }],
    category:     { type: String, required: true },
    rating:       { type: Number, default: 0, min: 0, max: 5 },
    reviewCount:  { type: Number, default: 0 },
    deliveryTime: { type: String, default: "30-45 min" },
    deliveryFee:  { type: Number, default: 2.99 },
    minOrder:     { type: Number, default: 5 },
    isOpen:       { type: Boolean, default: true },
    isActive:     { type: Boolean, default: true },
    address:      { type: String, default: "" },
    phone:        { type: String, default: "" },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: { type: [Number] }, // [lng, lat]
    },
    deliveryRadius: { type: Number, default: 5 }, // km
    tags:         [{ type: String }],
  },
  { timestamps: true }
);

// `unique: true` on `slug` creates an index automatically.
restaurantSchema.index({ category: 1, isActive: 1 });
// 2dsphere index enables $near / $geoWithin geo queries on location.
restaurantSchema.index({ location: "2dsphere" }, { sparse: true });

export const Restaurant = model<IRestaurant>("Restaurant", restaurantSchema);
