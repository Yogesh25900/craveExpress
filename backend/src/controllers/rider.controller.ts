import type { Request, Response } from "express";
import { z } from "zod";
import { Order } from "../models/Order";
import { Restaurant } from "../models/Restaurant";
import { ok } from "../utils/response";
import { AppError } from "../middleware/errorHandler";
import { sseManager } from "../lib/sseEmitter";
import { verifyAccessToken } from "../utils/jwt";
import { encryptPii } from "../utils/pii";
import type { OrderStatus } from "../models/Order";

const RIDER_STATUS_MAP: Partial<Record<OrderStatus, OrderStatus>> = {
  ready_for_pickup: "picked_up",
  picked_up:        "out_for_delivery",
  out_for_delivery: "delivered",
};

// rider SSE stream
export function riderSse(req: Request, res: Response): void {
  let riderId: string;
  try {
    const header = req.headers.authorization;
    const qToken = req.query.token as string | undefined;
    const token  = header?.startsWith("Bearer ") ? header.slice(7) : qToken;
    if (!token) { res.status(401).end(); return; }
    const payload = verifyAccessToken(token);
    if (payload.role !== "rider" && payload.role !== "admin") { res.status(403).end(); return; }
    riderId = payload.userId;
  } catch {
    res.status(401).end();
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: "connected", riderId })}\n\n`);
  sseManager.addRiderClient(riderId, res);

  req.on("close", () => {
    sseManager.removeRiderClient(riderId, res);
    res.end();
  });
}

// toggle availability
export async function setAvailability(req: Request, res: Response): Promise<void> {
  const riderId = req.user!.userId;
  const { isOnline } = z.object({ isOnline: z.boolean() }).parse(req.body);
  const { User } = await import("../models/User");
  await User.findByIdAndUpdate(riderId, { isOnline });
  ok(res, { isOnline });
}

// available orders
export async function availableOrders(_req: Request, res: Response): Promise<void> {
  const orders = await Order.find({
    status:  "ready_for_pickup",
    riderId: { $exists: false },
  })
    .sort({ createdAt: -1 })
    .lean();

  const enriched = await Promise.all(
    orders.map(async (o) => {
      const restaurant = await Restaurant.findOne({ slug: o.restaurantSlug })
        .select("location address")
        .lean();
      return {
        ...o,
        restaurantLocation: restaurant?.location ?? null,
        restaurantAddress:  restaurant?.address ?? "",
      };
    })
  );

  ok(res, { orders: enriched });
}

// active delivery
export async function activeOrder(req: Request, res: Response): Promise<void> {
  const riderId = req.user!.userId;
  const order = await Order.findOne({
    riderId,
    status: { $in: ["ready_for_pickup", "picked_up", "out_for_delivery"] },
  })
    .sort({ assignedAt: -1 })
    .lean();

  if (!order) { ok(res, { order: null }); return; }

  const restaurant = await Restaurant.findOne({ slug: order.restaurantSlug })
    .select("location address")
    .lean();

  ok(res, {
    order: {
      ...order,
      restaurantLocation: restaurant?.location ?? null,
      restaurantAddress:  restaurant?.address ?? "",
    },
  });
}

// delivery history
export async function deliveryHistory(req: Request, res: Response): Promise<void> {
  const riderId = req.user!.userId;
  const { page = "1", limit = "20" } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [orders, total] = await Promise.all([
    Order.find({ riderId, status: { $in: ["delivered", "cancelled"] } })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Order.countDocuments({ riderId, status: { $in: ["delivered", "cancelled"] } }),
  ]);

  ok(res, { orders, total, page: parseInt(page), limit: parseInt(limit) });
}

// earnings
export async function earnings(req: Request, res: Response): Promise<void> {
  const riderId = req.user!.userId;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const RATE = 0.80;

  const [todayOrders, weekOrders, monthOrders, allTime, daily] = await Promise.all([
    Order.find({ riderId, status: "delivered", updatedAt: { $gte: today } }).lean(),
    Order.find({ riderId, status: "delivered", updatedAt: { $gte: weekStart } }).lean(),
    Order.find({ riderId, status: "delivered", updatedAt: { $gte: monthStart } }).lean(),
    Order.find({ riderId, status: "delivered" }).lean(),
    Order.aggregate([
      { $match: { riderId, status: "delivered", updatedAt: { $gte: weekStart } } },
      { $group: { _id: { $dateToString: { format: "%m/%d", date: "$updatedAt" } }, earnings: { $sum: { $multiply: ["$deliveryFee", RATE] } }, deliveries: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", earnings: 1, deliveries: 1 } },
    ]),
  ]);

  const earn = (orders: typeof allTime) =>
    parseFloat(orders.reduce((s, o) => s + o.deliveryFee * RATE, 0).toFixed(2));

  ok(res, {
    today:   { earnings: earn(todayOrders), deliveries: todayOrders.length },
    week:    { earnings: earn(weekOrders),  deliveries: weekOrders.length  },
    month:   { earnings: earn(monthOrders), deliveries: monthOrders.length },
    allTime: { earnings: earn(allTime),     deliveries: allTime.length     },
    daily,
  });
}

// get specific order
export async function getRiderOrder(req: Request, res: Response): Promise<void> {
  const riderId = req.user!.userId;
  const order = await Order.findById(req.params.id).lean();
  if (!order) throw new AppError(404, "Order not found");

  if (req.user!.role !== "admin" && order.riderId?.toString() !== riderId) {
    throw new AppError(403, "Access denied");
  }

  const restaurant = await Restaurant.findOne({ slug: order.restaurantSlug })
    .select("location address")
    .lean();

  ok(res, {
    order: {
      ...order,
      restaurantLocation: restaurant?.location ?? null,
      restaurantAddress:  restaurant?.address ?? "",
    },
  });
}

// accept delivery
export async function acceptOrder(req: Request, res: Response): Promise<void> {
  const riderId = req.user!.userId;

  const active = await Order.findOne({
    riderId,
    status: { $in: ["ready_for_pickup", "picked_up", "out_for_delivery"] },
  });
  if (active) throw new AppError(400, "Finish your current delivery before accepting a new one");

  const { User } = await import("../models/User");
  const rider = await User.findById(riderId).select("fullName phone").lean();
  if (!rider) throw new AppError(404, "Rider not found");

  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, status: "ready_for_pickup", riderId: { $exists: false } },
    { $set: { riderId, riderName: rider.fullName, riderPhone: encryptPii(rider.phone ?? ""), assignedAt: new Date() } },
    { new: true }
  );

  if (!order) throw new AppError(409, "Order already taken by another rider");

  sseManager.sendToOrder(order._id.toString(), {
    type:       "rider_assigned",
    riderId,
    riderName:  rider.fullName,
    riderPhone: rider.phone,
  });

  sseManager.send(order.restaurantSlug, {
    type:      "rider_assigned",
    orderId:   order._id.toString(),
    riderName: rider.fullName,
  });

  sseManager.broadcastToAllRiders({
    type:    "delivery_request_taken",
    orderId: order._id.toString(),
  });

  ok(res, { order });
}

// reject delivery
export async function rejectOrder(req: Request, res: Response): Promise<void> {
  const riderId = req.user!.userId;
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError(404, "Order not found");

  if (order.riderId?.toString() !== riderId && req.user!.role !== "admin") {
    throw new AppError(403, "Not assigned to you");
  }
  if (["out_for_delivery", "picked_up", "delivered"].includes(order.status)) {
    throw new AppError(400, "Cannot reject an order already in transit");
  }

  order.riderId    = undefined;
  order.riderName  = undefined;
  order.riderPhone = undefined;
  order.assignedAt = undefined;
  await order.save();

  ok(res, { order });
}

// update order status
export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
  const riderId = req.user!.userId;
  const schema = z.object({
    status: z.enum(["picked_up", "out_for_delivery", "delivered"]),
  });
  const { status } = schema.parse(req.body);

  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError(404, "Order not found");

  if (order.riderId?.toString() !== riderId && req.user!.role !== "admin") {
    throw new AppError(403, "Not assigned to you");
  }

  const expected = RIDER_STATUS_MAP[order.status];
  if (expected !== status) {
    throw new AppError(400, `Invalid transition: "${order.status}" -> "${status}"`);
  }

  order.status = status;
  order.statusHistory.push({ status, at: new Date() });
  await order.save();

  sseManager.sendToOrder(order._id.toString(), {
    type:   "order_status_changed",
    status,
    at:     new Date().toISOString(),
  });

  sseManager.send(order.restaurantSlug, {
    type:    "order_status_changed",
    orderId: order._id.toString(),
    status,
  });

  ok(res, { order });
}

// update rider location
export async function updateLocation(req: Request, res: Response): Promise<void> {
  const riderId = req.user!.userId;
  const schema = z.object({
    orderId: z.string(),
    lat:     z.number().min(-90).max(90),
    lng:     z.number().min(-180).max(180),
  });
  const { orderId, lat, lng } = schema.parse(req.body);

  const order = await Order.findOne({
    _id:     orderId,
    riderId,
    status:  { $in: ["picked_up", "out_for_delivery"] },
  });
  if (!order) throw new AppError(404, "Active order not found");

  order.riderLocation = { lat, lng, updatedAt: new Date() };
  await order.save();

  sseManager.sendToOrder(orderId, {
    type: "rider_location",
    lat,
    lng,
    at:   new Date().toISOString(),
  });

  ok(res, { lat, lng });
}
