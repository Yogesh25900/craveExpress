"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShoppingBag, DollarSign, Clock, Star,
  CheckCircle, XCircle, ChevronRight, TrendingUp,
} from "lucide-react";
import { ownerApi } from "@/lib/api";
import { useOwnerSSE, type OwnerSseEvent } from "@/hooks/useOwnerSSE";

type OrderStatus = "placed" | "preparing" | "out_for_delivery" | "delivered" | "cancelled";

interface OwnerOrder {
  _id: string;
  shortId: string;
  customerName: string;
  items: Array<{ name: string; quantity: number }>;
  status: OrderStatus;
  total: number;
  placedAt: string;
  note?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptOrder(raw: any): OwnerOrder {
  const u = raw.userId;
  return {
    _id:          String(raw._id),
    shortId:      String(raw._id).slice(-6).toUpperCase(),
    customerName: typeof u === "object" ? String(u?.fullName ?? "Customer") : "Customer",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: ((raw.items ?? []) as any[]).map((i) => ({ name: String(i.name), quantity: Number(i.quantity ?? 1) })),
    status:       raw.status ?? "placed",
    total:        Number(raw.total ?? 0),
    placedAt:     String(raw.createdAt ?? raw.placedAt ?? new Date().toISOString()),
    note:         raw.note ?? undefined,
  };
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1)  return "just now";
  if (diff < 60) return `${diff} min ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

function itemSummary(items: OwnerOrder["items"]): string {
  return items.map((i) => (i.quantity > 1 ? `${i.quantity}× ${i.name}` : i.name)).join(", ");
}

const NEXT_STATUS: Partial<Record<OrderStatus, { label: string; next: OrderStatus }>> = {
  preparing:        { label: "Out for Delivery", next: "out_for_delivery" },
  out_for_delivery: { label: "Mark Delivered",   next: "delivered"        },
};

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub: string; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-xs text-gray-400 mt-1">{sub}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function RevenueChart({ data }: { data: { _id: string; revenue: number }[] }) {
  if (!data.length) return <div className="h-36 flex items-center justify-center text-sm text-gray-400">No data yet</div>;
  const max = Math.max(...data.map((d) => d.revenue));
  return (
    <div className="flex items-end gap-2 h-36">
      {data.map((d) => (
        <div key={d._id} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px] text-gray-400">${Math.round(d.revenue)}</span>
          <div className="w-full rounded-t-md bg-green-500 transition-all" style={{ height: `${Math.max((d.revenue / max) * 100, 2)}px` }} />
          <span className="text-[10px] text-gray-500 font-medium">{d._id}</span>
        </div>
      ))}
    </div>
  );
}

export default function OwnerDashboard() {
  const [orders, setOrders]   = useState<OwnerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<{ daily: { _id: string; revenue: number }[]; totals: { revenue: number; orders: number; delivered: number } } | null>(null);
  const [rating, setRating]   = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      ownerApi.getOrders({ limit: 50 }),
      ownerApi.getAnalytics(7),
      ownerApi.getRestaurant(),
    ]).then(([ordersRes, analyticsRes, restRes]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setOrders((ordersRes.orders as any[]).map(adaptOrder));
      setAnalytics(analyticsRes as { daily: { _id: string; revenue: number }[]; totals: { revenue: number; orders: number; delivered: number } });
      const rest = restRes.restaurant as { rating?: number };
      if (rest.rating) setRating(rest.rating);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Live: new order comes in → add to list
  const handleSseEvent = useCallback((event: OwnerSseEvent) => {
    if (event.type === "new_order") {
      const stub: OwnerOrder = {
        _id:          event.orderId,
        shortId:      event.shortId,
        customerName: event.customerName,
        items:        [{ name: `${event.itemCount} item${event.itemCount !== 1 ? "s" : ""}`, quantity: 1 }],
        status:       "placed",
        total:        event.total,
        placedAt:     event.placedAt,
      };
      setOrders((prev) => [stub, ...prev]);
    }
    if (event.type === "order_status_changed") {
      setOrders((prev) => prev.map((o) => o._id === event.orderId ? { ...o, status: event.status as OrderStatus } : o));
    }
  }, []);

  useOwnerSSE(handleSseEvent);

  async function updateStatus(id: string, status: OrderStatus) {
    setOrders((prev) => prev.map((o) => o._id === id ? { ...o, status } : o));
    try {
      await ownerApi.updateOrderStatus(id, status);
    } catch {
      // If failed, reload
      ownerApi.getOrders({ limit: 50 })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then(({ orders: raw }) => setOrders((raw as any[]).map(adaptOrder)))
        .catch(() => {});
    }
  }

  const newOrders    = orders.filter((o) => o.status === "placed");
  const activeOrders = orders.filter((o) => o.status === "preparing" || o.status === "out_for_delivery");

  const isToday = (iso: string) => {
    const d = new Date(iso); const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };
  const todayDelivered = orders.filter((o) => o.status === "delivered" && isToday(o.placedAt));
  const todayRevenue   = todayDelivered.reduce((s, o) => s + o.total, 0);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Today&apos;s overview for your restaurant</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingBag} label="Today's Orders"
          value={String(todayDelivered.length + activeOrders.length + newOrders.length)}
          sub={`${todayDelivered.length} delivered`} color="bg-blue-50 text-blue-600" />
        <StatCard icon={DollarSign} label="Today's Revenue"
          value={`$${todayRevenue.toFixed(2)}`}
          sub="From delivered orders" color="bg-green-50 text-green-600" />
        <StatCard icon={Clock} label="Pending Orders"
          value={String(newOrders.length)}
          sub={newOrders.length > 0 ? "Need your attention!" : "All caught up"}
          color={newOrders.length > 0 ? "bg-red-50 text-red-500" : "bg-gray-50 text-gray-400"} />
        <StatCard icon={Star} label="Avg Rating"
          value={rating ? rating.toFixed(1) : "—"}
          sub={analytics?.totals.orders ? `${analytics.totals.orders} orders total` : "No ratings yet"}
          color="bg-amber-50 text-amber-500" />
      </div>

      {newOrders.length > 0 && (
        <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-red-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <h2 className="font-semibold text-gray-900">New Orders</h2>
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{newOrders.length}</span>
            </div>
            <Link href="/owner/orders" className="text-xs text-green-600 hover:underline font-medium flex items-center gap-1">
              View all <ChevronRight size={13} />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {newOrders.map((order) => (
              <div key={order._id} className="px-5 py-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-gray-400">#{order.shortId}</span>
                      <span className="font-semibold text-gray-900 text-sm">{order.customerName}</span>
                      <span className="text-xs text-gray-400">{timeAgo(order.placedAt)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{itemSummary(order.items)}</p>
                    {order.note && <p className="text-xs text-amber-600 mt-0.5 italic">&ldquo;{order.note}&rdquo;</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-gray-800">${order.total.toFixed(2)}</span>
                    <button onClick={() => updateStatus(order._id, "preparing")}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors">
                      <CheckCircle size={13} /> Accept
                    </button>
                    <button onClick={() => updateStatus(order._id, "cancelled")}
                      className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 hover:border-red-300 hover:text-red-500 text-gray-500 text-xs font-semibold rounded-lg transition-colors">
                      <XCircle size={13} /> Reject
                    </button>
                    <Link href={`/owner/orders/${order._id}`} className="text-gray-400 hover:text-gray-600 transition-colors">
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Active Orders</h2>
            <Link href="/owner/orders" className="text-xs text-green-600 hover:underline font-medium flex items-center gap-1">
              View all <ChevronRight size={13} />
            </Link>
          </div>
          {activeOrders.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-gray-400">No active orders right now</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {activeOrders.map((order) => {
                const nextStep = NEXT_STATUS[order.status];
                return (
                  <div key={order._id} className="px-5 py-3.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs text-gray-400">#{order.shortId}</span>
                        <span className="text-sm font-medium text-gray-800">{order.customerName}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${order.status === "preparing" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                          {order.status === "preparing" ? "Preparing" : "Out for Delivery"}
                        </span>
                        <span className="text-xs text-gray-400">{timeAgo(order.placedAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold text-gray-700">${order.total.toFixed(2)}</span>
                      {nextStep && (
                        <button onClick={() => updateStatus(order._id, nextStep.next)}
                          className="text-xs px-2.5 py-1.5 bg-gray-900 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors whitespace-nowrap">
                          {nextStep.label}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Revenue — Last 7 Days</h2>
            <div className="flex items-center gap-1 text-green-600 text-xs font-semibold">
              <TrendingUp size={13} />
              <span>${analytics?.totals.revenue.toFixed(0) ?? "0"} total</span>
            </div>
          </div>
          <RevenueChart data={analytics?.daily ?? []} />
        </div>
      </div>
    </div>
  );
}
