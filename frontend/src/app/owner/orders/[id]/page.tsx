"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Phone, MessageSquare, CheckCircle, XCircle, Clock } from "lucide-react";
import { ownerApi } from "@/lib/api";

type OrderStatus = "placed" | "preparing" | "out_for_delivery" | "delivered" | "cancelled";

interface OwnerOrderFull {
  _id: string;
  shortId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  address: { label: string; street: string; city: string; zip: string };
  items: Array<{ name: string; price: number; quantity: number; selectedAddons: Array<{ name: string; price: number }> }>;
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod: string;
  placedAt: string;
  note?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adapt(raw: any): OwnerOrderFull {
  const u    = raw.userId;
  const addr = raw.address ?? {};
  return {
    _id:             String(raw._id),
    shortId:         String(raw._id).slice(-6).toUpperCase(),
    customerName:    typeof u === "object" ? String(u?.fullName ?? "Customer") : "Customer",
    customerEmail:   typeof u === "object" ? String(u?.email ?? "") : "",
    customerPhone:   typeof u === "object" ? String(u?.phone ?? "") : "",
    deliveryAddress: addr.street ? `${addr.street}, ${addr.city} ${addr.zip}` : "",
    address:         { label: addr.label ?? "Home", street: addr.street ?? "", city: addr.city ?? "", zip: addr.zip ?? "" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: ((raw.items ?? []) as any[]).map((i) => ({
      name:     String(i.name),
      price:    Number(i.price ?? 0),
      quantity: Number(i.quantity ?? 1),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      selectedAddons: ((i.selectedAddons ?? []) as any[]).map((a) => ({ name: String(a.name), price: Number(a.price ?? 0) })),
    })),
    status:        raw.status ?? "placed",
    subtotal:      Number(raw.subtotal ?? 0),
    deliveryFee:   Number(raw.deliveryFee ?? 0),
    discount:      Number(raw.discount ?? 0),
    total:         Number(raw.total ?? 0),
    paymentMethod: raw.paymentMethod ?? "cod",
    placedAt:      String(raw.createdAt ?? raw.placedAt ?? new Date().toISOString()),
    note:          raw.note ?? undefined,
  };
}

const STATUS_FLOW: OrderStatus[] = ["placed", "preparing", "out_for_delivery", "delivered"];

const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Order Placed", preparing: "Preparing",
  out_for_delivery: "Out for Delivery", delivered: "Delivered", cancelled: "Cancelled",
};

const ACTIONS: Partial<Record<OrderStatus, { label: string; next: OrderStatus; style: string }>> = {
  placed:           { label: "Start Preparing",    next: "preparing",        style: "bg-green-600 hover:bg-green-700 text-white" },
  preparing:        { label: "Out for Delivery",   next: "out_for_delivery", style: "bg-gray-900 hover:bg-gray-700 text-white"  },
  out_for_delivery: { label: "Mark Delivered",     next: "delivered",        style: "bg-gray-900 hover:bg-gray-700 text-white"  },
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function OwnerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [order, setOrder]       = useState<OwnerOrderFull | null>(null);
  const [loaded, setLoaded]     = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    ownerApi.getOrder(id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ order: raw }) => setOrder(adapt(raw as any)))
      .catch(() => setOrder(null))
      .finally(() => setLoaded(true));
  }, [id]);

  async function advance(next: OrderStatus) {
    if (!order || updating) return;
    setUpdating(true);
    try {
      await ownerApi.updateOrderStatus(order._id, next);
      setOrder((o) => o ? { ...o, status: next } : o);
    } catch { /* ignore */ }
    finally { setUpdating(false); }
  }

  async function cancel() {
    if (!order || updating) return;
    setUpdating(true);
    try {
      await ownerApi.updateOrderStatus(order._id, "cancelled");
      setOrder((o) => o ? { ...o, status: "cancelled" } : o);
    } catch { /* ignore */ }
    finally { setUpdating(false); }
  }

  if (!loaded) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
    </div>
  );

  if (!order) return (
    <div className="max-w-2xl mx-auto py-20 text-center">
      <p className="text-gray-400 text-sm">Order not found.</p>
      <Link href="/owner/orders" className="text-green-600 text-sm hover:underline mt-2 block">← Back to Orders</Link>
    </div>
  );

  const action      = ACTIONS[order.status];
  const isCancelled = order.status === "cancelled";
  const isDelivered = order.status === "delivered";
  const isDone      = isCancelled || isDelivered;
  const currentStep = isCancelled ? -1 : STATUS_FLOW.indexOf(order.status);

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/owner/orders" className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-gray-900">Order #{order.shortId}</h1>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              isCancelled ? "bg-gray-100 text-gray-500" :
              isDelivered ? "bg-green-100 text-green-700" :
              order.status === "placed" ? "bg-red-100 text-red-600" :
              order.status === "preparing" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
            }`}>
              {STATUS_LABEL[order.status]}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <Clock size={11} /> Placed {fmt(order.placedAt)}
          </p>
        </div>
      </div>

      {!isCancelled && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Order Timeline</h2>
          <ol className="relative space-y-0">
            {STATUS_FLOW.map((s, i) => {
              const done   = i < currentStep || (isDelivered && i === currentStep);
              const active = i === currentStep && !isDelivered;
              return (
                <li key={s} className="flex items-start gap-3 pb-5 last:pb-0 relative">
                  {i < STATUS_FLOW.length - 1 && (
                    <span className={`absolute left-[9px] top-5 w-0.5 h-full ${done ? "bg-green-400" : "bg-gray-200"}`} />
                  )}
                  <span className={`relative z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5
                    ${done ? "bg-green-500 border-green-500" : active ? "bg-white border-green-500 shadow-[0_0_0_4px_rgba(34,197,94,0.15)]" : "bg-white border-gray-300"}`}>
                    {done   && <span className="w-2 h-2 rounded-full bg-white" />}
                    {active && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                  </span>
                  <div className="pt-0.5">
                    <p className={`text-sm font-medium ${active ? "text-green-600" : done ? "text-gray-700" : "text-gray-400"}`}>
                      {STATUS_LABEL[s]}
                    </p>
                    {(done || active) && <p className="text-xs text-gray-400">{active ? "In progress" : fmt(order.placedAt)}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Customer Details</h2>
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-semibold text-xs shrink-0">
            {order.customerName.charAt(0)}
          </div>
          <div>
            <p className="font-medium">{order.customerName}</p>
            {order.customerEmail && <p className="text-xs text-gray-400">{order.customerEmail}</p>}
          </div>
        </div>
        {order.customerPhone && (
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <Phone size={14} className="mt-0.5 shrink-0 text-gray-400" />
            <span>{order.customerPhone}</span>
          </div>
        )}
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <MapPin size={14} className="mt-0.5 shrink-0 text-gray-400" />
          <span>{order.deliveryAddress}</span>
        </div>
        {order.note && (
          <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            <MessageSquare size={14} className="mt-0.5 shrink-0" />
            <span className="italic">&ldquo;{order.note}&rdquo;</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Items Ordered</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {order.items.map((item, idx) => {
            const addonCost = item.selectedAddons.reduce((s, a) => s + a.price, 0);
            return (
              <div key={idx} className="px-5 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {item.quantity > 1 && <span className="text-gray-400 mr-1">{item.quantity}×</span>}
                      {item.name}
                    </p>
                    {item.selectedAddons.length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">+ {item.selectedAddons.map((a) => a.name).join(", ")}</p>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-gray-800 shrink-0">
                    ${((item.price + addonCost) * item.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 space-y-1.5">
          <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>${order.subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Delivery fee</span>
            {order.deliveryFee === 0 ? <span className="text-green-600">Free</span> : <span>${order.deliveryFee.toFixed(2)}</span>}
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-sm text-green-600"><span>Discount</span><span>−${order.discount.toFixed(2)}</span></div>
          )}
          <div className="flex justify-between text-sm font-bold text-gray-900 pt-1.5 border-t border-gray-200">
            <span>Total</span><span>${order.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-400 pt-0.5">
            <span>Payment</span><span className="capitalize">{order.paymentMethod === "cod" ? "Cash on delivery" : "Card"}</span>
          </div>
        </div>
      </div>

      {!isDone && (
        <div className="flex gap-3">
          {action && (
            <button onClick={() => advance(action.next)} disabled={updating}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 ${action.style}`}>
              <CheckCircle size={16} />
              {updating ? "Updating…" : action.label}
            </button>
          )}
          <button onClick={cancel} disabled={updating}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 bg-white hover:border-red-300 hover:text-red-500 text-gray-500 font-semibold text-sm transition-colors disabled:opacity-60">
            <XCircle size={16} /> Cancel
          </button>
        </div>
      )}

      {isDone && (
        <div className={`rounded-xl px-5 py-4 text-sm font-medium text-center ${
          isDelivered ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-50 text-gray-500 border border-gray-200"
        }`}>
          {isDelivered ? "✓ Delivered successfully." : "✗ Order was cancelled."}
        </div>
      )}
    </div>
  );
}
