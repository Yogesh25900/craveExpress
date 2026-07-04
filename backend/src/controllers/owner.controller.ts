import type { Request, Response } from "express";
import { z } from "zod";
import { Restaurant } from "../models/Restaurant";
import { MenuItem } from "../models/MenuItem";
import { MenuCategory } from "../models/MenuCategory";
import { Order } from "../models/Order";
import type { OrderStatus } from "../models/Order";
import { ok } from "../utils/response";
import { AppError } from "../middleware/errorHandler";
import { sseManager } from "../lib/sseEmitter";

// resolve the restaurant slug for this owner (admins may pass ?restaurantSlug=)
function getSlug(req: { user?: { role: string; restaurantSlug?: string }; query: Record<string, unknown> }): string {
  if (req.user?.role === "admin") {
    const slug = req.query.restaurantSlug as string | undefined;
    if (!slug) throw new AppError(400, "restaurantSlug query param required for admin access");
    return slug;
  }
  return req.user!.restaurantSlug!;
}

export const updateRestaurantSchema = z.object({
  name:           z.string().min(2).optional(),
  banner:         z.string().optional(),
  image:          z.string().optional(),
  cuisineTypes:   z.array(z.string()).optional(),
  category:       z.string().optional(),
  deliveryFee:    z.number().min(0).optional(),
  minOrder:       z.number().min(0).optional(),
  deliveryTime:   z.string().optional(),
  address:        z.string().optional(),
  phone:          z.string().optional(),
  isOpen:         z.boolean().optional(),
  tags:           z.array(z.string()).optional(),
  deliveryRadius: z.number().min(0.5).max(100).optional(),
  location: z.object({
    type:        z.literal("Point"),
    coordinates: z.tuple([z.number(), z.number()]),
  }).optional(),
});

export const menuCategorySchema = z.object({ name: z.string().min(1).max(60), sortOrder: z.number().int().optional() });

export const menuItemSchema = z.object({
  name:        z.string().min(1),
  description: z.string().default(""),
  price:       z.number().positive(),
  image:       z.string().url(),
  category:    z.string().min(1),
  isPopular:   z.boolean().default(false),
  isVeg:       z.boolean().default(false),
  isAvailable: z.boolean().default(true),
  addons: z.array(z.object({ name: z.string(), price: z.number().min(0) })).default([]),
});

const OWNER_STATUS_FLOW: OrderStatus[] = ["placed", "accepted", "preparing", "ready_for_pickup"];
const OWNER_REJECTABLE:  OrderStatus[] = ["placed", "accepted", "preparing"];

// owner SSE stream
export function ownerSse(req: Request, res: Response): void {
  const slug = getSlug(req);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write(`data: {"type":"connected","restaurantSlug":"${slug}"}\n\n`);
  sseManager.addClient(slug, res);

  req.on("close", () => {
    sseManager.removeClient(slug, res);
    res.end();
  });
}

// get restaurant profile
export async function getRestaurant(req: Request, res: Response): Promise<void> {
  const slug = getSlug(req);
  const restaurant = await Restaurant.findOne({ slug }).lean();
  if (!restaurant) throw new AppError(404, "Restaurant not found");
  ok(res, { restaurant: { ...restaurant, id: restaurant.slug } });
}

// update restaurant profile
export async function updateRestaurant(req: Request, res: Response): Promise<void> {
  const slug = getSlug(req);
  const restaurant = await Restaurant.findOneAndUpdate(
    { slug },
    req.body as z.infer<typeof updateRestaurantSchema>,
    { new: true }
  );
  if (!restaurant) throw new AppError(404, "Restaurant not found");
  ok(res, { restaurant: { ...restaurant.toJSON(), id: restaurant.slug } });
}

// list categories
export async function listCategories(req: Request, res: Response): Promise<void> {
  const slug = getSlug(req);
  const restaurant = await Restaurant.findOne({ slug }).select("_id").lean();
  if (!restaurant) throw new AppError(404, "Restaurant not found");

  const cats = await MenuCategory.find({ restaurantSlug: slug }).sort({ sortOrder: 1, name: 1 }).lean();
  const itemCounts = await MenuItem.aggregate([
    { $match: { restaurantSlug: slug, isAvailable: true } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);
  const countMap = new Map<string, number>(itemCounts.map((x) => [x._id as string, x.count as number]));

  ok(res, {
    categories: cats.map((c) => ({
      id:        (c._id as { toString(): string }).toString(),
      name:      c.name,
      sortOrder: c.sortOrder,
      count:     countMap.get(c.name) ?? 0,
    })),
  });
}

// create category
export async function createCategory(req: Request, res: Response): Promise<void> {
  const slug = getSlug(req);
  const restaurant = await Restaurant.findOne({ slug }).select("_id").lean();
  if (!restaurant) throw new AppError(404, "Restaurant not found");

  const { name, sortOrder } = req.body as z.infer<typeof menuCategorySchema>;
  const exists = await MenuCategory.findOne({ restaurantSlug: slug, name: { $regex: `^${name}$`, $options: "i" } });
  if (exists) throw new AppError(409, "A category with that name already exists");

  const cat = await MenuCategory.create({ restaurantId: restaurant._id, restaurantSlug: slug, name: name.trim(), sortOrder: sortOrder ?? 0 });
  ok(res, { category: { id: cat._id.toString(), name: cat.name, sortOrder: cat.sortOrder, count: 0 } }, 201);
}

// rename category
export async function updateCategory(req: Request, res: Response): Promise<void> {
  const slug = getSlug(req);
  const { name } = req.body as z.infer<typeof menuCategorySchema>;

  const cat = await MenuCategory.findOne({ _id: req.params.id, restaurantSlug: slug });
  if (!cat) throw new AppError(404, "Category not found");

  const oldName = cat.name;
  cat.name = name.trim();
  await cat.save();

  if (oldName !== cat.name) {
    await MenuItem.updateMany({ restaurantSlug: slug, category: oldName }, { category: cat.name });
  }

  const count = await MenuItem.countDocuments({ restaurantSlug: slug, category: cat.name, isAvailable: true });
  ok(res, { category: { id: cat._id.toString(), name: cat.name, sortOrder: cat.sortOrder, count } });
}

// delete category
export async function deleteCategory(req: Request, res: Response): Promise<void> {
  const slug = getSlug(req);
  const cat = await MenuCategory.findOne({ _id: req.params.id, restaurantSlug: slug });
  if (!cat) throw new AppError(404, "Category not found");

  const count = await MenuItem.countDocuments({ restaurantSlug: slug, category: cat.name, isAvailable: true });
  if (count > 0) throw new AppError(400, `Move or remove the ${count} item(s) in this category first`);

  await cat.deleteOne();
  ok(res, { message: "Category deleted" });
}

// list menu
export async function listMenu(req: Request, res: Response): Promise<void> {
  const slug = getSlug(req);
  const items = await MenuItem.find({ restaurantSlug: slug }).sort({ category: 1, name: 1 }).lean();
  ok(res, {
    items: items.map((i) => ({
      ...i,
      id: (i._id as { toString(): string }).toString(),
      restaurantId: slug,
    })),
  });
}

// create menu item
export async function createMenuItem(req: Request, res: Response): Promise<void> {
  const slug = getSlug(req);
  const restaurant = await Restaurant.findOne({ slug });
  if (!restaurant) throw new AppError(404, "Restaurant not found");

  const item = await MenuItem.create({
    ...(req.body as z.infer<typeof menuItemSchema>),
    restaurantId:   restaurant._id,
    restaurantSlug: slug,
  });
  ok(res, { item: { ...item.toJSON(), id: item._id.toString(), restaurantId: slug } }, 201);
}

// update menu item
export async function updateMenuItem(req: Request, res: Response): Promise<void> {
  const slug = getSlug(req);
  const data = req.body as Partial<z.infer<typeof menuItemSchema>>;
  const item = await MenuItem.findOneAndUpdate(
    { _id: req.params.id, restaurantSlug: slug },
    data,
    { new: true }
  );
  if (!item) throw new AppError(404, "Menu item not found");
  ok(res, { item: { ...item.toJSON(), id: item._id.toString(), restaurantId: slug } });
}

// soft delete menu item
export async function deleteMenuItem(req: Request, res: Response): Promise<void> {
  const slug = getSlug(req);
  const item = await MenuItem.findOneAndUpdate(
    { _id: req.params.id, restaurantSlug: slug },
    { isAvailable: false },
    { new: true }
  );
  if (!item) throw new AppError(404, "Menu item not found");
  ok(res, { message: "Item deactivated" });
}

// list orders
export async function listOrders(req: Request, res: Response): Promise<void> {
  const slug = getSlug(req);
  const { status, page = "1", limit = "20" } = req.query as Record<string, string>;

  const restaurant = await Restaurant.findOne({ slug }).select("_id").lean();
  if (!restaurant) throw new AppError(404, "Restaurant not found");

  const filter: Record<string, unknown> = { restaurantId: restaurant._id };
  if (status) filter.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("userId", "fullName email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Order.countDocuments(filter),
  ]);

  ok(res, { orders, total, page: parseInt(page), limit: parseInt(limit) });
}

// get order
export async function getOrder(req: Request, res: Response): Promise<void> {
  const slug = getSlug(req);
  const restaurant = await Restaurant.findOne({ slug }).select("_id").lean();
  if (!restaurant) throw new AppError(404, "Restaurant not found");

  const order = await Order.findOne({ _id: req.params.id, restaurantId: restaurant._id })
    .populate("userId", "fullName email phone")
    .lean();
  if (!order) throw new AppError(404, "Order not found");
  ok(res, { order });
}

// update order status
export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
  const slug = getSlug(req);
  const schema = z.object({
    status: z.enum(["accepted", "rejected", "preparing", "ready_for_pickup", "cancelled"]),
  });
  const { status } = schema.parse(req.body);

  const restaurant = await Restaurant.findOne({ slug }).select("_id address").lean();
  if (!restaurant) throw new AppError(404, "Restaurant not found");

  const order = await Order.findOne({ _id: req.params.id, restaurantId: restaurant._id });
  if (!order) throw new AppError(404, "Order not found");

  if (status === "rejected" || status === "cancelled") {
    if (!OWNER_REJECTABLE.includes(order.status as OrderStatus)) {
      throw new AppError(400, `Cannot reject/cancel an order in "${order.status}" status`);
    }
  } else {
    const currentIdx = OWNER_STATUS_FLOW.indexOf(order.status as OrderStatus);
    const newIdx     = OWNER_STATUS_FLOW.indexOf(status as OrderStatus);
    if (newIdx <= currentIdx) throw new AppError(400, "Cannot move order backwards");
  }

  order.status = status as OrderStatus;
  order.statusHistory.push({ status: status as OrderStatus, at: new Date() });
  await order.save();

  ok(res, { order });

  sseManager.sendToOrder(order._id.toString(), {
    type:   "order_status_changed",
    status,
    at:     new Date().toISOString(),
  });

  sseManager.send(slug, {
    type:    "order_status_changed",
    orderId: order._id.toString(),
    status,
  });

  if (status === "ready_for_pickup") {
    const { User } = await import("../models/User");
    const onlineRiders = await User.find({ role: "rider", isOnline: true }).select("_id").lean();
    const deliveryRequest = {
      type:            "delivery_request",
      orderId:         order._id.toString(),
      restaurantName:  order.restaurantName,
      restaurantAddress: (restaurant as { address?: string }).address ?? "",
      deliveryAddress: `${order.address.street}${order.address.city ? ", " + order.address.city : ""}`,
      deliveryFee:     order.deliveryFee,
      earning:         parseFloat((order.deliveryFee * 0.8).toFixed(2)),
      itemSummary:     order.items.map((i) => `${i.quantity}x ${i.name}`).join(", "),
      total:           order.total,
    };
    for (const rider of onlineRiders) {
      sseManager.sendToRider(rider._id.toString(), deliveryRequest);
    }
  }
}

// analytics
export async function analytics(req: Request, res: Response): Promise<void> {
  const slug  = getSlug(req);
  const days  = Math.min(parseInt((req.query.days as string) ?? "30"), 90);
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const restaurant = await Restaurant.findOne({ slug }).select("_id").lean();
  if (!restaurant) throw new AppError(404, "Restaurant not found");

  const [daily, totals, topItems] = await Promise.all([
    Order.aggregate([
      { $match: { restaurantId: restaurant._id, createdAt: { $gte: start }, status: "delivered" } },
      {
        $group: {
          _id:     { $dateToString: { format: "%m/%d", date: "$createdAt" } },
          revenue: { $sum: "$total" },
          orders:  { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: { restaurantId: restaurant._id, createdAt: { $gte: start } } },
      {
        $group: {
          _id:       null,
          revenue:   { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, "$total", 0] } },
          orders:    { $sum: 1 },
          delivered: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
        },
      },
    ]),
    Order.aggregate([
      { $match: { restaurantId: restaurant._id, status: "delivered", createdAt: { $gte: start } } },
      { $unwind: "$items" },
      { $group: { _id: "$items.name", orders: { $sum: "$items.quantity" }, revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } } } },
      { $sort: { orders: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, name: "$_id", orders: 1, revenue: 1 } },
    ]),
  ]);

  ok(res, {
    daily,
    totals: totals[0] ?? { revenue: 0, orders: 0, delivered: 0, cancelled: 0 },
    topItems,
    days,
  });
}
