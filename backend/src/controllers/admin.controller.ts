import type { Request, Response } from "express";
import { z } from "zod";
import { Order } from "../models/Order";
import { Restaurant } from "../models/Restaurant";
import { MenuItem } from "../models/MenuItem";
import { User } from "../models/User";
import { Coupon } from "../models/Coupon";
import { PlatformCategory } from "../models/PlatformCategory";
import { PlatformSettings } from "../models/PlatformSettings";
import { ok } from "../utils/response";
import { AppError } from "../middleware/errorHandler";
import { sseManager } from "../lib/sseEmitter";
import { getRecentSecurityEvents } from "../lib/logger";

// ── Schemas ─────────────────────────────────────────────────────────────────
export const restaurantSchema = z.object({
  slug:         z.string().min(2),
  name:         z.string().min(2),
  image:        z.string().url(),
  banner:       z.string().url(),
  cuisineTypes: z.array(z.string()).default([]),
  category:     z.string(),
  deliveryFee:  z.number().min(0).default(2.99),
  minOrder:     z.number().min(0).default(5),
  deliveryTime: z.string().default("30-45 min"),
  address:      z.string().default(""),
  isOpen:       z.boolean().default(true),
  tags:         z.array(z.string()).default([]),
});

export const adminMenuItemSchema = z.object({
  name:           z.string().min(1),
  description:    z.string().default(""),
  price:          z.number().positive(),
  image:          z.string().url(),
  category:       z.string().min(1),
  restaurantId:   z.string().optional(),
  restaurantSlug: z.string().optional(),
  isPopular:      z.boolean().default(false),
  isVeg:          z.boolean().default(false),
  isAvailable:    z.boolean().default(true),
  addons: z.array(z.object({ name: z.string(), price: z.number().min(0) })).default([]),
});

export const couponSchema = z.object({
  code:        z.string().min(2).transform((v) => v.toUpperCase()),
  type:        z.enum(["percent", "flat"]),
  value:       z.number().positive(),
  minOrder:    z.number().min(0).default(0),
  maxUses:     z.number().min(0).default(0),
  expiresAt:   z.string().or(z.date()),
  isActive:    z.boolean().default(true),
  description: z.string().default(""),
});

export const platformCatSchema = z.object({
  name:      z.string().min(1).max(60),
  slug:      z.string().min(1).max(60).regex(/^[a-z0-9-]+$/).optional(),
  emoji:     z.string().min(1),
  sortOrder: z.number().int().optional(),
  isActive:  z.boolean().optional(),
});

// ── Stats ─────────────────────────────────────────────────────────────────
export async function stats(_req: Request, res: Response): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalOrders, todayOrders, activeOrders, totalUsers,
    totalRevenue, todayRevenue,
  ] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ createdAt: { $gte: today } }),
    Order.countDocuments({ status: { $in: ["placed", "preparing", "out_for_delivery"] } }),
    User.countDocuments({ role: "user" }),
    Order.aggregate([{ $match: { status: "delivered" } }, { $group: { _id: null, total: { $sum: "$total" } } }]),
    Order.aggregate([{ $match: { status: "delivered", createdAt: { $gte: today } } }, { $group: { _id: null, total: { $sum: "$total" } } }]),
  ]);

  ok(res, {
    stats: {
      totalOrders, todayOrders, activeOrders, totalUsers,
      totalRevenue: (totalRevenue[0]?.total as number | undefined) ?? 0,
      todayRevenue: (todayRevenue[0]?.total as number | undefined) ?? 0,
    },
  });
}

// ── Analytics ───────────────────────────────────────────────────────────────
export async function analytics(req: Request, res: Response): Promise<void> {
  const days  = Math.min(parseInt((req.query.days as string) ?? "30"), 90);
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const [daily, topRestaurants] = await Promise.all([
    Order.aggregate([
      { $match: { createdAt: { $gte: start }, status: "delivered" } },
      {
        $group: {
          _id:     { $dateToString: { format: "%m/%d", date: "$createdAt" } },
          revenue: { $sum: "$total" },
          orders:  { $sum: 1 },
          users:   { $addToSet: "$userId" },
        },
      },
      { $project: { _id: 0, date: "$_id", revenue: 1, orders: 1, users: { $size: "$users" } } },
      { $sort: { date: 1 } },
    ]),
    Order.aggregate([
      { $match: { status: "delivered" } },
      { $group: { _id: "$restaurantId", name: { $first: "$restaurantName" }, revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, restaurantId: "$_id", name: 1, revenue: 1, orders: 1 } },
    ]),
  ]);

  ok(res, { analytics: daily, topRestaurants, days });
}

// ── Orders ────────────────────────────────────────────────────────────────
export async function listOrders(req: Request, res: Response): Promise<void> {
  const { status, restaurantId, search, page = "1", limit = "20" } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (restaurantId) filter.restaurantId = restaurantId;
  if (search) {
    filter.$or = [
      { restaurantName: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("userId", "fullName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Order.countDocuments(filter),
  ]);

  ok(res, { orders, total, page: parseInt(page), limit: parseInt(limit) });
}

export async function getOrder(req: Request, res: Response): Promise<void> {
  const order = await Order.findById(req.params.id)
    .populate("userId", "fullName email phone")
    .lean();
  if (!order) throw new AppError(404, "Order not found");
  ok(res, { order });
}

export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
  const schema = z.object({
    status: z.enum(["placed", "preparing", "out_for_delivery", "delivered", "cancelled"]),
  });
  const { status } = schema.parse(req.body);
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status, $push: { statusHistory: { status, at: new Date() } } },
    { new: true }
  );
  if (!order) throw new AppError(404, "Order not found");
  ok(res, { order });
}

// ── Transactions ──────────────────────────────────────────────────────────
export async function listTransactions(req: Request, res: Response): Promise<void> {
  const { method, status, search, page = "1", limit = "30" } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = { status: { $in: ["delivered", "cancelled"] } };
  if (method && method !== "all") filter.paymentMethod = method;
  if (status === "paid")     filter.status = "delivered";
  if (status === "refunded") filter.status = "cancelled";

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("userId", "fullName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Order.countDocuments(filter),
  ]);

  const idOf = (id: unknown) => (id as { toString(): string }).toString();

  const transactions = orders
    .filter((o) => {
      if (!search) return true;
      const customer = (o.userId as unknown as { fullName?: string })?.fullName ?? "";
      return customer.toLowerCase().includes(search.toLowerCase()) ||
        idOf(o._id).slice(-6).toUpperCase().includes(search.toUpperCase());
    })
    .map((o) => ({
      id:             `TXN-${idOf(o._id).slice(-8).toUpperCase()}`,
      orderNumber:    idOf(o._id).slice(-6).toUpperCase(),
      orderId:        idOf(o._id),
      customerName:   (o.userId as unknown as { fullName?: string })?.fullName ?? "Unknown",
      restaurantName: o.restaurantName,
      amount:         o.total,
      method:         o.paymentMethod,
      status:         o.status === "delivered" ? "paid" : "refunded",
      date:           o.createdAt,
    }));

  ok(res, { transactions, total });
}

// ── Restaurants ─────────────────────────────────────────────────────────────
export async function listRestaurants(_req: Request, res: Response): Promise<void> {
  const restaurants = await Restaurant.find().sort({ createdAt: -1 }).lean();
  ok(res, { restaurants: restaurants.map((r) => ({ ...r, id: r.slug })) });
}

export async function createRestaurant(req: Request, res: Response): Promise<void> {
  const data = req.body as z.infer<typeof restaurantSchema>;
  const exists = await Restaurant.findOne({ slug: data.slug });
  if (exists) throw new AppError(409, "A restaurant with this slug already exists");
  const restaurant = await Restaurant.create(data);
  ok(res, { restaurant: { ...restaurant.toJSON(), id: restaurant.slug } }, 201);
}

export async function updateRestaurant(req: Request, res: Response): Promise<void> {
  const data = req.body as Partial<z.infer<typeof restaurantSchema>>;
  const restaurant = await Restaurant.findByIdAndUpdate(req.params.id, data, { new: true });
  if (!restaurant) throw new AppError(404, "Restaurant not found");
  ok(res, { restaurant: { ...restaurant.toJSON(), id: restaurant.slug } });
}

export async function deleteRestaurant(req: Request, res: Response): Promise<void> {
  await Restaurant.findByIdAndUpdate(req.params.id, { isActive: false });
  ok(res, { message: "Restaurant deactivated" });
}

// ── Menu items ──────────────────────────────────────────────────────────────
export async function listMenuItems(req: Request, res: Response): Promise<void> {
  const { restaurantSlug } = req.query as { restaurantSlug?: string };
  const filter: Record<string, unknown> = {};
  if (restaurantSlug) filter.restaurantSlug = restaurantSlug;
  const items = await MenuItem.find(filter).sort({ category: 1, name: 1 }).lean();
  ok(res, { items: items.map((i) => ({ ...i, id: (i._id as { toString(): string }).toString() })) });
}

export async function createMenuItem(req: Request, res: Response): Promise<void> {
  const data = req.body as z.infer<typeof adminMenuItemSchema>;
  const item = await MenuItem.create(data);
  ok(res, { item }, 201);
}

export async function updateMenuItem(req: Request, res: Response): Promise<void> {
  const data = req.body as Partial<z.infer<typeof adminMenuItemSchema>>;
  const item = await MenuItem.findByIdAndUpdate(req.params.id, data, { new: true });
  if (!item) throw new AppError(404, "Menu item not found");
  ok(res, { item });
}

export async function deleteMenuItem(req: Request, res: Response): Promise<void> {
  await MenuItem.findByIdAndUpdate(req.params.id, { isAvailable: false });
  ok(res, { message: "Menu item deactivated" });
}

// ── Users ─────────────────────────────────────────────────────────────────
export async function listUsers(req: Request, res: Response): Promise<void> {
  const { search, role, page = "1", limit = "20" } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = {};
  if (role && role !== "all") filter.role = role;
  if (search) filter.$or = [
    { fullName: { $regex: search, $options: "i" } },
    { email:    { $regex: search, $options: "i" } },
  ];

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    User.countDocuments(filter),
  ]);

  ok(res, { users, total });
}

export async function updateUserRole(req: Request, res: Response): Promise<void> {
  const schema = z.object({
    role:           z.enum(["user", "admin", "owner"]),
    restaurantSlug: z.string().optional(),
  });
  const { role, restaurantSlug } = schema.parse(req.body);

  const update: Record<string, unknown> = { role };
  if (role === "owner" && restaurantSlug) {
    const restaurant = await Restaurant.findOne({ slug: restaurantSlug }).select("_id slug").lean();
    if (!restaurant) throw new AppError(404, "Restaurant not found");
    update.restaurantId   = restaurant._id;
    update.restaurantSlug = restaurant.slug;
  } else if (role !== "owner") {
    update.restaurantId   = undefined;
    update.restaurantSlug = undefined;
  }

  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!user) throw new AppError(404, "User not found");
  ok(res, { user });
}

export async function toggleBanUser(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError(404, "User not found");
  if (user.role === "admin") throw new AppError(403, "Cannot ban an admin");
  user.isBanned = !user.isBanned;
  await user.save();
  ok(res, { user, banned: user.isBanned });
}

// ── Coupons ───────────────────────────────────────────────────────────────
export async function listCoupons(_req: Request, res: Response): Promise<void> {
  const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
  ok(res, { coupons });
}

export async function createCoupon(req: Request, res: Response): Promise<void> {
  const data = req.body as z.infer<typeof couponSchema>;
  const exists = await Coupon.findOne({ code: data.code });
  if (exists) throw new AppError(409, "A coupon with this code already exists");
  const coupon = await Coupon.create(data);
  ok(res, { coupon }, 201);
}

export async function updateCoupon(req: Request, res: Response): Promise<void> {
  const data = req.body as Partial<z.infer<typeof couponSchema>>;
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, data, { new: true });
  if (!coupon) throw new AppError(404, "Coupon not found");
  ok(res, { coupon });
}

export async function deleteCoupon(req: Request, res: Response): Promise<void> {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) throw new AppError(404, "Coupon not found");
  ok(res, { message: "Coupon deleted" });
}

export async function validateCoupon(req: Request, res: Response): Promise<void> {
  const { code, orderTotal } = req.body as { code: string; orderTotal: number };
  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
  if (!coupon) throw new AppError(404, "Invalid or expired coupon");
  if (new Date(coupon.expiresAt) < new Date()) throw new AppError(400, "Coupon has expired");
  if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) throw new AppError(400, "Coupon has reached its usage limit");
  if (orderTotal < coupon.minOrder) throw new AppError(400, `Minimum order of $${coupon.minOrder} required`);
  const discount = coupon.type === "percent"
    ? (orderTotal * coupon.value) / 100
    : Math.min(coupon.value, orderTotal);
  ok(res, { coupon, discount });
}

// ── Platform Settings ─────────────────────────────────────────────────────
export async function getSettings(_req: Request, res: Response): Promise<void> {
  const existing = await PlatformSettings.findOne({ key: "global" }).lean();
  const settings = existing ?? (await PlatformSettings.create({ key: "global" })).toJSON();
  ok(res, { settings });
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  const allowed = [
    "platformName", "supportEmail", "supportPhone",
    "defaultDeliveryFee", "defaultMinOrder", "commissionRate",
    "maintenanceMode", "allowGuestCheckout", "maxDeliveryRadius",
  ];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      update[key] = (req.body as Record<string, unknown>)[key];
    }
  }

  const settings = await PlatformSettings.findOneAndUpdate(
    { key: "global" },
    { $set: update },
    { new: true, upsert: true }
  );
  ok(res, { settings });
}

// ── Riders ────────────────────────────────────────────────────────────────
export async function listRiders(req: Request, res: Response): Promise<void> {
  const { search } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = { role: "rider" };
  if (search) {
    filter.$or = [
      { fullName: { $regex: search, $options: "i" } },
      { email:    { $regex: search, $options: "i" } },
    ];
  }
  const riders = await User.find(filter).sort({ fullName: 1 }).lean();

  const enriched = await Promise.all(riders.map(async (r) => {
    const riderId = r._id;
    const [active, total] = await Promise.all([
      Order.countDocuments({ riderId, status: { $in: ["placed", "preparing", "out_for_delivery"] } }),
      Order.countDocuments({ riderId, status: "delivered" }),
    ]);
    return { ...r, activeDeliveries: active, totalDeliveries: total };
  }));

  ok(res, { riders: enriched });
}

export async function assignRider(req: Request, res: Response): Promise<void> {
  const schema = z.object({ riderId: z.string() });
  const { riderId } = schema.parse(req.body);

  const rider = await User.findOne({ _id: riderId, role: "rider" }).lean();
  if (!rider) throw new AppError(404, "Rider not found");

  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError(404, "Order not found");
  if (["delivered", "cancelled"].includes(order.status)) {
    throw new AppError(400, "Cannot assign rider to a completed or cancelled order");
  }

  order.riderId    = riderId as unknown as import("mongoose").Types.ObjectId;
  order.riderName  = rider.fullName;
  order.riderPhone = rider.phone;
  order.assignedAt = new Date();
  await order.save();

  sseManager.sendToRider(riderId, {
    type:          "order_assigned",
    orderId:       order._id.toString(),
    shortId:       order._id.toString().slice(-6).toUpperCase(),
    restaurantName: order.restaurantName,
    total:         order.total,
    address:       order.address,
  });

  ok(res, { order });
}

export async function unassignRider(req: Request, res: Response): Promise<void> {
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError(404, "Order not found");
  if (order.status === "out_for_delivery") {
    throw new AppError(400, "Cannot unassign rider from an order already out for delivery");
  }

  order.riderId    = undefined;
  order.riderName  = undefined;
  order.riderPhone = undefined;
  order.assignedAt = undefined;
  await order.save();

  ok(res, { order });
}

// ── Platform categories ───────────────────────────────────────────────────
export async function listPlatformCategories(_req: Request, res: Response): Promise<void> {
  const cats = await PlatformCategory.find().sort({ sortOrder: 1, name: 1 }).lean();
  const counts = await Restaurant.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);
  const countMap = new Map<string, number>(counts.map((x) => [x._id as string, x.count as number]));
  ok(res, {
    categories: cats.map((c) => ({
      id:              (c._id as { toString(): string }).toString(),
      slug:            c.slug,
      name:            c.name,
      emoji:           c.emoji,
      sortOrder:       c.sortOrder,
      isActive:        c.isActive,
      restaurantCount: countMap.get(c.slug) ?? 0,
    })),
  });
}

export async function createPlatformCategory(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof platformCatSchema>;
  const slug = body.slug ?? body.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const exists = await PlatformCategory.findOne({ slug });
  if (exists) throw new AppError(409, "A category with that slug already exists");
  const cat = await PlatformCategory.create({ ...body, slug });
  ok(res, { category: cat }, 201);
}

export async function updatePlatformCategory(req: Request, res: Response): Promise<void> {
  const cat = await PlatformCategory.findByIdAndUpdate(req.params.id, req.body as Record<string, unknown>, { new: true });
  if (!cat) throw new AppError(404, "Category not found");
  ok(res, { category: cat });
}

export async function deletePlatformCategory(req: Request, res: Response): Promise<void> {
  const cat = await PlatformCategory.findByIdAndDelete(req.params.id);
  if (!cat) throw new AppError(404, "Category not found");
  ok(res, { message: "Category deleted" });
}

// ── Security audit log ──────────────────────────────────────────────────────
export function auditLog(req: Request, res: Response): void {
  const limitParam = Number((req.query as { limit?: string }).limit ?? "100");
  const limit = Math.min(Math.max(isNaN(limitParam) ? 100 : limitParam, 1), 500);
  const events = getRecentSecurityEvents(limit);
  ok(res, { events, count: events.length });
}
