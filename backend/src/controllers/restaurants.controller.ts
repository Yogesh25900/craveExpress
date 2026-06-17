import type { Request, Response } from "express";
import { z } from "zod";
import { Restaurant } from "../models/Restaurant";
import { MenuItem } from "../models/MenuItem";
import { Review } from "../models/Review";
import { ok } from "../utils/response";
import { AppError } from "../middleware/errorHandler";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const reviewSchema = z.object({
  rating:  z.number().int().min(1).max(5),
  comment: z.string().min(5).max(500),
});

// list restaurants
export async function listRestaurants(req: Request, res: Response): Promise<void> {
  const { category, search, sort, lat, lng, radius } = req.query as Record<string, string | undefined>;

  const userLat = lat ? parseFloat(lat) : null;
  const userLng = lng ? parseFloat(lng) : null;
  const maxRadius = radius ? parseFloat(radius) : null;

  const filter: Record<string, unknown> = { isActive: true };
  if (category && category !== "all") filter.category = category;
  if (search) filter.name = { $regex: search, $options: "i" };

  if (userLat !== null && userLng !== null) {
    filter.location = {
      $near: {
        $geometry: { type: "Point", coordinates: [userLng, userLat] },
        $maxDistance: (maxRadius ?? 50) * 1000,
      },
    };
  }

  const usesGeoSort = (sort === "nearest" || !sort) && userLat !== null;

  let restaurants;
  if (usesGeoSort) {
    restaurants = await Restaurant.find(filter).lean();
  } else {
    let query = Restaurant.find(filter);
    if (sort === "rating")       query = query.sort({ rating: -1 });
    else if (sort === "fee")     query = query.sort({ deliveryFee: 1 });
    else if (sort === "fastest") query = query.sort({ deliveryTime: 1 });
    else if (sort !== "nearest") query = query.sort({ reviewCount: -1 });
    restaurants = await query.lean();
  }

  const result = restaurants
    .map((r) => {
      const out: Record<string, unknown> = { ...r, id: r.slug };
      if (userLat !== null && userLng !== null && r.location?.coordinates) {
        const [rLng, rLat] = r.location.coordinates;
        out.distance = parseFloat(haversineKm(userLat, userLng, rLat, rLng).toFixed(2));
      }
      return out;
    })
    .filter((r) => {
      if (userLat === null || userLng === null) return true;
      const raw = restaurants.find((x) => x.slug === r.id);
      if (!raw?.location?.coordinates) return true;
      const dist = r.distance as number;
      return dist <= (raw.deliveryRadius ?? 5);
    });

  ok(res, { restaurants: result });
}

// get restaurant
export async function getRestaurant(req: Request, res: Response): Promise<void> {
  const restaurant = await Restaurant.findOne({ slug: req.params.slug, isActive: true }).lean();
  if (!restaurant) throw new AppError(404, "Restaurant not found");
  ok(res, { restaurant: { ...restaurant, id: restaurant.slug } });
}

// get menu
export async function getMenu(req: Request, res: Response): Promise<void> {
  const restaurant = await Restaurant.findOne({ slug: req.params.slug }).lean();
  if (!restaurant) throw new AppError(404, "Restaurant not found");

  const items = await MenuItem.find({
    restaurantSlug: req.params.slug,
    isAvailable: true,
  }).lean();

  const categorySet = new Set(items.map((i) => i.category));
  const categories = Array.from(categorySet).map((id) => ({ id, name: id }));

  const mappedItems = items.map((item) => ({
    ...item,
    id: (item._id as { toString(): string }).toString(),
    restaurantId: req.params.slug,
    addons: item.addons.map((a) => ({
      ...a,
      id: (a._id as { toString(): string }).toString(),
    })),
  }));

  ok(res, { categories, items: mappedItems });
}

// get reviews
export async function getReviews(req: Request, res: Response): Promise<void> {
  const reviews = await Review.find({ restaurantSlug: req.params.slug })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  ok(res, { reviews });
}

// create review
export async function createReview(req: Request, res: Response): Promise<void> {
  const restaurant = await Restaurant.findOne({ slug: req.params.slug, isActive: true });
  if (!restaurant) throw new AppError(404, "Restaurant not found");

  const { rating, comment } = req.body as z.infer<typeof reviewSchema>;

  const review = await Review.create({
    restaurantId:   restaurant._id,
    restaurantSlug: req.params.slug,
    userId:         req.user!.userId,
    userName:       "User",
    rating,
    comment,
    avatarColor:    "bg-orange-500",
  });

  const agg = await Review.aggregate([
    { $match: { restaurantSlug: req.params.slug } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  if (agg[0]) {
    await Restaurant.findByIdAndUpdate(restaurant._id, {
      rating:      parseFloat((agg[0].avg as number).toFixed(1)),
      reviewCount: agg[0].count as number,
    });
  }

  ok(res, { review }, 201);
}
