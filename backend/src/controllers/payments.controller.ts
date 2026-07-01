import type { Request, Response } from "express";
import { z } from "zod";
import { Order } from "../models/Order";
import { ok } from "../utils/response";
import { AppError } from "../middleware/errorHandler";
import { env } from "../config/env";
import { securityLog } from "../lib/logger";
import {
  buildEsewaForm,
  decodeEsewaCallback,
  verifyEsewaCallback,
  checkEsewaStatus,
} from "../utils/esewa";

const API_BASE = `http://localhost:${env.PORT}/api`;

export const initiateSchema = z.object({ orderId: z.string() });

// initiate eSewa payment
export async function initiateEsewa(req: Request, res: Response): Promise<void> {
  const { orderId } = req.body as z.infer<typeof initiateSchema>;

  const order = await Order.findById(orderId);
  if (!order) throw new AppError(404, "Order not found");
  if (order.userId.toString() !== req.user!.userId) throw new AppError(403, "Access denied");
  if (order.paymentMethod !== "esewa") throw new AppError(400, "This order is not an eSewa order");
  if (order.payment?.status === "paid") throw new AppError(409, "This order is already paid");

  const transactionUuid = `${order._id}-${Date.now()}`;
  order.payment = { provider: "esewa", status: "pending", transactionUuid };
  await order.save();

  const form = buildEsewaForm({
    transactionUuid,
    totalAmount: order.total,
    successUrl: `${API_BASE}/payments/esewa/success`,
    failureUrl: `${API_BASE}/payments/esewa/failure`,
  });

  securityLog("PAYMENT_INITIATED", { req, userId: req.user!.userId, meta: { orderId, transactionUuid } });
  ok(res, form);
}

// eSewa success callback
export async function esewaSuccess(req: Request, res: Response): Promise<void> {
  const data = req.query.data as string | undefined;
  const cb = data ? decodeEsewaCallback(data) : null;

  const fail = (reason: string, uuid?: string) => {
    securityLog("PAYMENT_FAILED", { req, meta: { reason, uuid } });
    return res.redirect(`${env.CLIENT_URL}/order-confirmed?payment=failed`);
  };

  if (!cb || !verifyEsewaCallback(cb)) { fail("bad_signature"); return; }

  const orderId = cb.transaction_uuid.split("-")[0];
  const order = await Order.findById(orderId);
  if (!order) { fail("order_not_found", cb.transaction_uuid); return; }
  if (order.payment?.transactionUuid !== cb.transaction_uuid) { fail("uuid_mismatch", cb.transaction_uuid); return; }

  const status = await checkEsewaStatus(cb.transaction_uuid, order.total);
  if (status !== "COMPLETE") { fail(`status_${status}`, cb.transaction_uuid); return; }

  order.payment = {
    provider: "esewa",
    status: "paid",
    transactionUuid: cb.transaction_uuid,
    ref: cb.transaction_code,
    paidAt: new Date(),
  };
  await order.save();

  securityLog("PAYMENT_SUCCESS", { req, userId: order.userId.toString(), meta: { orderId, ref: cb.transaction_code } });
  res.redirect(`${env.CLIENT_URL}/order-confirmed?id=${orderId}&payment=success`);
}

// eSewa failure callback
export async function esewaFailure(req: Request, res: Response): Promise<void> {
  const data = req.query.data as string | undefined;
  const cb = data ? decodeEsewaCallback(data) : null;
  if (cb) {
    const orderId = cb.transaction_uuid.split("-")[0];
    await Order.findByIdAndUpdate(orderId, { "payment.status": "failed" }).catch(() => {});
    securityLog("PAYMENT_FAILED", { req, meta: { orderId, reason: "user_cancelled_or_declined" } });
  }
  res.redirect(`${env.CLIENT_URL}/order-confirmed?payment=failed`);
}
