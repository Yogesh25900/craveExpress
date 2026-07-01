import type { Request, Response } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { Order } from "../models/Order";
import { MenuItem } from "../models/MenuItem";
import { Restaurant } from "../models/Restaurant";
import { Coupon } from "../models/Coupon";
import { User } from "../models/User";
import { ok, created } from "../utils/response";
import { AppError } from "../middleware/errorHandler";
import { sseManager } from "../lib/sseEmitter";
import { verifyAccessToken } from "../utils/jwt";

export const placeOrderSchema = z.object({
  restaurantId: z.string(),
  items: z.array(z.object({
    menuItemId:     z.string(),
    name:           z.string(),
    image:          z.string().default(""),
    price:          z.number().optional(),
    quantity:       z.number().int().min(1).max(50),
    selectedAddons: z.array(z.object({
      name:  z.string(),
      price: z.number().optional(),
    })).default([]),
  })).min(1).max(30),
  address: z.object({
    label:  z.string().default("Home"),
    street: z.string().min(3),
    city:   z.string().default(""),
    zip:    z.string().default(""),
  }),
  paymentMethod: z.enum(["cod", "card", "esewa"]).default("cod"),
  promoCode:     z.string().max(30).optional(),
  notes:         z.string().max(500).optional(),
});

export const validateCouponSchema = z.object({
  code:       z.string().min(1).max(30),
  orderTotal: z.number().positive(),
});

// place order
export async function placeOrder(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof placeOrderSchema>;

  const restaurant =
    await Restaurant.findOne({ slug: body.restaurantId }) ??
    await Restaurant.findById(body.restaurantId).catch(() => null);
  if (!restaurant || !restaurant.isActive) throw new AppError(404, "Restaurant not found");
  if (!restaurant.isOpen) throw new AppError(400, "This restaurant is currently closed");

  const menuItemIds = [...new Set(body.items.map(i => i.menuItemId))];
  const dbItems = await MenuItem.find({
    _id:          { $in: menuItemIds },
    restaurantId: restaurant._id,
    isAvailable:  true,
  }).lean();
  const itemMap = new Map(dbItems.map(m => [(m._id as { toString(): string }).toString(), m]));

  let subtotal = 0;
  const computedItems: {
    menuItemId: (typeof dbItems)[0]["_id"];
    name: string; image: string; price: number; quantity: number;
    selectedAddons: { name: string; price: number }[];
  }[] = [];

  for (const ci of body.items) {
    const dbItem = itemMap.get(ci.menuItemId);
    if (!dbItem) {
      throw new AppError(400, `Item "${ci.name}" is unavailable or does not belong to this restaurant`);
    }

    const addonPriceMap = new Map(dbItem.addons.map(a => [a.name, a.price]));
    let addonSum = 0;
    const computedAddons: { name: string; price: number }[] = [];
    for (const ca of ci.selectedAddons) {
      const dbPrice = addonPriceMap.get(ca.name);
      if (dbPrice === undefined) {
        throw new AppError(400, `Addon "${ca.name}" is not available for "${dbItem.name}"`);
      }
      addonSum += dbPrice;
      computedAddons.push({ name: ca.name, price: dbPrice });
    }

    subtotal += (dbItem.price + addonSum) * ci.quantity;
    computedItems.push({
      menuItemId:     dbItem._id,
      name:           dbItem.name,
      image:          dbItem.image,
      price:          dbItem.price,
      quantity:       ci.quantity,
      selectedAddons: computedAddons,
    });
  }
  subtotal = parseFloat(subtotal.toFixed(2));

  if (subtotal < restaurant.minOrder) {
    throw new AppError(400, `Minimum order for this restaurant is $${restaurant.minOrder.toFixed(2)}`);
  }

  let discount = 0;
  let couponId: mongoose.Types.ObjectId | undefined;

  if (body.promoCode) {
    const coupon = await Coupon.findOne({
      code:     body.promoCode.toUpperCase(),
      isActive: true,
    });
    if (!coupon)                                           throw new AppError(400, "Invalid coupon code");
    if (new Date(coupon.expiresAt) < new Date())          throw new AppError(400, "This coupon has expired");
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses)
                                                           throw new AppError(400, "This coupon has reached its usage limit");
    if (subtotal < coupon.minOrder)                        throw new AppError(400, `Minimum order of $${coupon.minOrder.toFixed(2)} required for this coupon`);

    discount = coupon.type === "percent"
      ? parseFloat(((subtotal * coupon.value) / 100).toFixed(2))
      : Math.min(coupon.value, subtotal);
    couponId = coupon._id as mongoose.Types.ObjectId;
  }

  const deliveryFee = restaurant.deliveryFee;
  const total       = parseFloat((subtotal + deliveryFee - discount).toFixed(2));

  const orderData = {
    userId:               req.user!.userId,
    restaurantId:         restaurant._id,
    restaurantSlug:       restaurant.slug,
    restaurantName:       restaurant.name,
    restaurantImage:      restaurant.image,
    items:                computedItems,
    address:              body.address,
    paymentMethod:        body.paymentMethod,
    subtotal,
    deliveryFee,
    discount,
    promoCode:            body.promoCode?.toUpperCase(),
    total,
    notes:                body.notes,
    payment:              body.paymentMethod === "esewa"
      ? { provider: "esewa" as const, status: "pending" as const }
      : undefined,
    estimatedDeliveryMins: 35,
    statusHistory:        [{ status: "placed", at: new Date() }],
  } as const;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let order!: any;
  const session = await mongoose.startSession();
  let sessionEnded = false;

  try {
    await session.withTransaction(async () => {
      const [doc] = await Order.create([orderData], { session });
      order = doc;
      if (couponId) {
        await Coupon.updateOne({ _id: couponId }, { $inc: { usedCount: 1 } }, { session });
      }
    });
    await session.endSession();
    sessionEnded = true;
  } catch (err) {
    if (!sessionEnded) {
      await session.endSession().catch(() => { /* ignore double-end */ });
    }
    const isStandaloneErr = /replica|Transaction numbers are only allowed/i.test(
      String((err as Error).message ?? "")
    );
    if (!isStandaloneErr) throw err;

    const [doc] = await Order.create([orderData]);
    order = doc;
    if (couponId) {
      await Coupon.updateOne({ _id: couponId }, { $inc: { usedCount: 1 } });
    }
  }

  created(res, { order });

  User.findById(req.user!.userId).select("fullName").lean()
    .then((u) => {
      sseManager.send(restaurant.slug, {
        type:         "new_order",
        orderId:      String(order._id),
        shortId:      String(order._id).slice(-6).toUpperCase(),
        customerName: u?.fullName ?? "Customer",
        total,
        itemCount:    computedItems.reduce((s, i) => s + i.quantity, 0),
        placedAt:     new Date().toISOString(),
      });
    })
    .catch(() => { /* non-critical */ });
}

// list orders
export async function listOrders(req: Request, res: Response): Promise<void> {
  const orders = await Order.find({ userId: req.user!.userId })
    .sort({ createdAt: -1 })
    .lean();
  ok(res, { orders });
}

// get order
export async function getOrder(req: Request, res: Response): Promise<void> {
  const order = await Order.findById(req.params.id).lean();
  if (!order) throw new AppError(404, "Order not found");

  const userId  = req.user!.userId;
  const role    = req.user!.role;
  const isOwner = order.userId.toString() === userId;
  const isRider = order.riderId?.toString() === userId;
  const isAdmin = role === "admin";

  if (!isOwner && !isRider && !isAdmin) throw new AppError(403, "Access denied");

  ok(res, { order });
}

// order SSE
export function orderSse(req: Request, res: Response): void {
  const orderId = req.params.id;

  let userId: string;
  let role: string;
  try {
    const header = req.headers.authorization;
    const qToken = req.query.token as string | undefined;
    const token  = header?.startsWith("Bearer ") ? header.slice(7) : qToken;
    if (!token) { res.status(401).end(); return; }
    const payload = verifyAccessToken(token);
    userId = payload.userId;
    role   = payload.role;
  } catch {
    res.status(401).end();
    return;
  }

  Order.findById(orderId).lean().then((order) => {
    if (!order) { res.status(404).end(); return; }

    const isOwner = order.userId.toString() === userId;
    const isRider = order.riderId?.toString() === userId;
    const isAdmin = role === "admin";

    if (!isOwner && !isRider && !isAdmin) { res.status(403).end(); return; }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    res.write(`data: ${JSON.stringify({ type: "connected", orderId })}\n\n`);
    sseManager.addOrderClient(orderId, res);

    req.on("close", () => {
      sseManager.removeOrderClient(orderId, res);
      res.end();
    });
  }).catch(() => res.status(500).end());
}

// cancel order
export async function cancelOrder(req: Request, res: Response): Promise<void> {
  const order = await Order.findOne({ _id: req.params.id, userId: req.user!.userId });
  if (!order) throw new AppError(404, "Order not found");

  const cancellable = ["placed", "accepted", "preparing"];
  if (!cancellable.includes(order.status)) {
    throw new AppError(400, "Order can no longer be cancelled");
  }

  order.status = "cancelled";
  order.statusHistory.push({ status: "cancelled", at: new Date() });
  await order.save();

  sseManager.sendToOrder(order._id.toString(), {
    type:   "order_status_changed",
    status: "cancelled",
    at:     new Date().toISOString(),
  });

  ok(res, { order });
}

// validate coupon
export async function validateCoupon(req: Request, res: Response): Promise<void> {
  const { code, orderTotal } = validateCouponSchema.parse(req.body);

  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
  if (!coupon)                                         throw new AppError(404, "Invalid or expired coupon");
  if (new Date(coupon.expiresAt) < new Date())         throw new AppError(400, "Coupon has expired");
  if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses)
                                                        throw new AppError(400, "Coupon has reached its usage limit");
  if (orderTotal < coupon.minOrder)
    throw new AppError(400, `Minimum order of $${coupon.minOrder.toFixed(2)} required for this coupon`);

  const discount = coupon.type === "percent"
    ? parseFloat(((orderTotal * coupon.value) / 100).toFixed(2))
    : Math.min(coupon.value, orderTotal);

  ok(res, { valid: true, discount, coupon: { code: coupon.code, type: coupon.type, value: coupon.value } });
}
