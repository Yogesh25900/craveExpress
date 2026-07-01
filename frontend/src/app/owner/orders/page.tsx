"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { CheckCircle, XCircle, ChevronRight, Search, RefreshCw } from "lucide-react";
import { ownerApi } from "@/lib/api";
import { useOwnerSSE, type OwnerSseEvent } from "@/hooks/useOwnerSSE";

type OrderStatus = "placed" | "accepted" | "rejected" | "preparing" | "ready_for_pickup" | "picked_up" | "out_for_delivery" | "delivered" | "cancelled";

interface OwnerOrder {
  _id: string;
  shortId: string;
  customerName: string;
  deliveryAddress: string;
  items: Array<{ name: string; quantity: number }>;
  status: OrderStatus;
  total: number;
  placedAt: string;
  note?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adapt(raw: any): OwnerOrder {
  const u = raw.userId;
  const addr = raw.address;
  return {
    _id:             String(raw._id),
    shortId:         String(raw._id).slice(-6).toUpperCase(),
    customerName:    typeof u === "object" ? String(u?.fullName ?? "Customer") : "Customer",
    deliveryAddress: addr ? `${addr.street}, ${addr.city} ${addr.zip}` : "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items:           ((raw.items ?? []) as any[]).map((i) => ({ name: String(i.name), quantity: Number(i.quantity ?? 1) })),
    status:          raw.status ?? "placed",
    total:           Number(raw.total ?? 0),
    placedAt:        String(raw.createdAt ?? raw.placedAt ?? new Date().toISOString()),
    note:            raw.note ?? undefined,
  };
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  placed:           "New",
  accepted:         "Accepted",
  rejected:         "Rejected",
  preparing:        "Preparing",
  ready_for_pickup: "Ready for Pickup",
  picked_up:        "Picked Up",
  out_for_delivery: "Out for Delivery",
  delivered:        "Delivered",
  cancelled:        "Cancelled",
};
const STATUS_STYLE: Record<OrderStatus, string> = {
  placed:           "bg-red-100 text-red-700",
  accepted:         "bg-indigo-100 text-indigo-700",
  rejected:         "bg-red-100 text-red-400",
  preparing:        "bg-blue-100 text-blue-700",
  ready_for_pickup: "bg-yellow-100 text-yellow-700",
  picked_up:        "bg-purple-100 text-purple-700",
  out_for_delivery: "bg-purple-100 text-purple-700",
  delivered:        "bg-green-100 text-green-700",
  cancelled:        "bg-gray-100 text-gray-500",
};
// Restaurant only controls: accepted → preparing → ready_for_pickup
const NEXT: Partial<Record<OrderStatus, { label: string; next: OrderStatus }>> = {
  accepted:         { label: "Start Preparing",  next: "preparing"        },
  preparing:        { label: "Mark Ready",        next: "ready_for_pickup" },
};

type Tab = "new" | "active" | "completed" | "rejected" | "all";

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1)  return "just now";
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function OrderRow({ order, onAccept, onReject, onAdvance }: {
  order: OwnerOrder;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onAdvance: (id: string, next: OrderStatus) => void;
}) {
  const nextStep = NEXT[order.status];
  const isNew    = order.status === "placed";
  return (
    <div className={`px-5 py-4 hover:bg-gray-50 transition-colors ${isNew ? "bg-red-50/30" : ""}`}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold text-gray-400">#{order.shortId}</span>
            <span className="font-semibold text-gray-900 text-sm">{order.customerName}</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[order.status]}`}>
              {STATUS_LABEL[order.status]}
            </span>
            <span className="text-xs text-gray-400 ml-auto">{timeAgo(order.placedAt)}</span>
          </div>
          <p className="text-xs text-gray-500 line-clamp-1">
            {order.items.map((i) => (i.quantity > 1 ? `${i.quantity}× ${i.name}` : i.name)).join(", ")}
          </p>
          {order.note && <p className="text-xs text-amber-600 mt-0.5 italic">&ldquo;{order.note}&rdquo;</p>}
          <p className="text-xs text-gray-400 mt-0.5 truncate">{order.deliveryAddress}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <span className="text-sm font-bold text-gray-800">${order.total.toFixed(2)}</span>
          {isNew && (
            <>
              <button onClick={() => onAccept(order._id)}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors">
                <CheckCircle size={12} /> Accept
              </button>
              <button onClick={() => onReject(order._id)}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 hover:border-red-300 hover:text-red-500 text-gray-500 text-xs font-semibold rounded-lg transition-colors">
                <XCircle size={12} /> Reject
              </button>
            </>
          )}
          {nextStep && (
            <button onClick={() => onAdvance(order._id, nextStep.next)}
              className="px-3 py-1.5 bg-gray-900 hover:bg-gray-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap">
              {nextStep.label}
            </button>
          )}
          <Link href={`/owner/orders/${order._id}`} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OwnerOrdersPage() {
  const [orders, setOrders]   = useState<OwnerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setTab]   = useState<Tab>("new");
  const [search, setSearch]   = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function fetchOrders() {
    try {
      const { orders: raw } = await ownerApi.getOrders({ limit: 100 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setOrders((raw as any[]).map(adapt));
    } catch { /* show stale data */ }
  }

  useEffect(() => {
    fetchOrders().finally(() => setLoading(false));
  }, []);

  // Live updates via SSE
  const handleSseEvent = useCallback((event: OwnerSseEvent) => {
    if (event.type === "new_order") {
      // Reload to get full order details
      fetchOrders().catch(() => {});
    }
    if (event.type === "order_status_changed") {
      setOrders((prev) => prev.map((o) => o._id === event.orderId ? { ...o, status: event.status as OrderStatus } : o));
    }
  }, []);

  useOwnerSSE(handleSseEvent);

  async function changeStatus(id: string, status: OrderStatus) {
    setOrders((prev) => prev.map((o) => o._id === id ? { ...o, status } : o));
    try { await ownerApi.updateOrderStatus(id, status); }
    catch { fetchOrders().catch(() => {}); }
  }

  async function refresh() {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }

  const counts = {
    new:       orders.filter((o) => o.status === "placed").length,
    active:    orders.filter((o) => ["accepted", "preparing", "ready_for_pickup", "picked_up", "out_for_delivery"].includes(o.status)).length,
    completed: orders.filter((o) => o.status === "delivered").length,
    rejected:  orders.filter((o) => o.status === "rejected" || o.status === "cancelled").length,
    all:       orders.length,
  };

  const filtered = orders
    .filter((o) => {
      if (activeTab === "new")       return o.status === "placed";
      if (activeTab === "active")    return ["accepted", "preparing", "ready_for_pickup", "picked_up", "out_for_delivery"].includes(o.status);
      if (activeTab === "completed") return o.status === "delivered";
      if (activeTab === "rejected")  return o.status === "rejected" || o.status === "cancelled";
      return true;
    })
    .filter((o) =>
      !search ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.shortId.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());

  const TABS: { key: Tab; label: string }[] = [
    { key: "new",       label: "New"       },
    { key: "active",    label: "Active"    },
    { key: "completed", label: "Completed" },
    { key: "rejected",  label: "Rejected"  },
    { key: "all",       label: "All"       },
  ];

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage and update your incoming orders</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} disabled={refreshing}
            className="p-2 text-gray-400 hover:text-gray-700 disabled:opacity-40 transition-colors border border-gray-200 rounded-lg bg-white">
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          </button>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search by name or order #" value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 w-56"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-100">
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px
                ${activeTab === key ? "border-green-500 text-green-600" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
              {label}
              {counts[key] > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  key === "new" ? "bg-red-500 text-white" : activeTab === key ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}>
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className="py-16 text-center"><p className="text-gray-400 text-sm">No orders in this category</p></div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((order) => (
              <OrderRow key={order._id} order={order}
                onAccept={(id) => changeStatus(id, "accepted")}
                onReject={(id) => changeStatus(id, "rejected")}
                onAdvance={changeStatus}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
