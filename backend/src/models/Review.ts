import { Schema, model, Document, Types } from "mongoose";

export interface IReview extends Document {
  restaurantId: Types.ObjectId;
  restaurantSlug: string;
  userId: Types.ObjectId;
  userName: string;
  rating: number;       // 1-5
  comment: string;
  avatarColor: string;  // Tailwind bg class e.g. "bg-blue-500"
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    restaurantId:   { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    restaurantSlug: { type: String, required: true },
    userId:         { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName:       { type: String, required: true },
    rating:         { type: Number, required: true, min: 1, max: 5 },
    comment:        { type: String, required: true, trim: true },
    avatarColor:    { type: String, default: "bg-orange-500" },
  },
  { timestamps: true }
);

reviewSchema.index({ restaurantId: 1, createdAt: -1 });

export const Review = model<IReview>("Review", reviewSchema);
