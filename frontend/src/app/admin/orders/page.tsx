"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, ChevronRight, Clock } from "lucide-react";
import { adminApi } from "@/lib/api";

type OrderStatus = "placed" | "preparing" | "out_for_delivery" | "delivered" | "cancelled";

interface AdminOrder {
  _id: string;
  userId: { _id: string; fullName: string } | null;
  restaurantId: string;
  restaurantName: string;
  items: { name: string; quantity: number }[];
  total: number;
  status: OrderStatus;
  paymentMethod: string;
  createdAt: string;
}

interface Restaurant { _id: string; name: string; id: string }

const STATUS_STYLE: Record<OrderStatus, string> = {
  placed:           "bg-red-100 text-red-700",
  preparing:        "bg-blue-100 text-blue-700",
  out_for_delivery: "bg-purple-100 text-purple-700",
  delivered:        "bg-green-100 text-green-700",
  cancelled:        "bg-gray-100 text-gray-500",
};
const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "New", preparing: "Preparing", out_for_delivery: "En Route", delivered: "Delivered", cancelled: "Cancelled",
};
const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  placed: "preparing", preparing: "out_for_delivery", out_for_delivery: "delivered",
};

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 1) return "just now"; if (d < 60) return `${d}m ago`;
  if (d < 1440) return `${Math.floor(d / 60)}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function orderNum(id: string) { return id.slice(-6).toUpperCase(); }
function customerName(order: AdminOrder) { return (order.userId as { fullName: string } | null)?.fullName ?? "Unknown"; }

type StatusFilter = OrderStatus | "all";

export default function AdminOrdersPage() {
  const [orders, setOrders]             = useState<AdminOrder[]>([]);
  const [restaurants, setRestaurants]   = useState<Restaurant[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [statusFilter, setStatus]       = useState<StatusFilter>("all");
  const [restaurantFilter, setRestFilter] = useState("all");
  const [search, setSearch]             = useState("");

  useEffect(() => {
    Promise.all([
      adminApi.orders({ limit: 100 }),
      adminApi.restaurants(),
    ])
    .then(([o, r]) => {
      setOrders((o.orders as AdminOrder[]) ?? []);
      setRestaurants((r.restaurants as Restaurant[]) ?? []);
    })
    .catch(() => setError("Failed to load orders"))
    .finally(() => setLoading(false));
  }, []);

  async function advance(id: string, current: OrderStatus) {
    const next = NEXT[current];
    if (!next) return;
    try {
      const res = await adminApi.updateOrderStatus(id, next);
      const updated = res.order as AdminOrder;
      setOrders((p) => p.map((o) => o._id === id ? { ...o, status: updated.status } : o));
    } catch (e) {
      alert((e as Error).message);
    }
  }

  const filtered = orders.filter((o) => {
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const matchRest   = restaurantFilter === "all" || o.restaurantId === restaurantFilter;
    const name = customerName(o);
    const matchText = !search || name.toLowerCase().includes(search.toLowerCase()) ||
      orderNum(o._id).toLowerCase().includes(search.toLowerCase()) ||
      o.restaurantName.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchRest && matchText;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const counts: Record<StatusFilter, number> = {
    all: orders.length,
    placed: orders.filter((o) => o.status === "placed").length,
    preparing: orders.filter((o) => o.status === "preparing").length,
    out_for_delivery: orders.filter((o) => o.status === "out_for_delivery").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  const STATUS_TABS: StatusFilter[] = ["all","placed","preparing","out_for_delivery","delivered","cancelled"];
  const LABELS: Record<StatusFilter, string> = { all: "All", placed: "New", preparing: "Preparing", out_for_delivery: "En Route", delivered: "Delivered", cancelled: "Cancelled" };

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">All platform orders</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={restaurantFilter} onChange={(e) => setRestFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400">
            <option value="all">All Restaurants</option>
            {restaurants.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
          </select>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 w-44" />
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>}

      <div className="flex gap-1 flex-wrap overflow-x-auto">
        {STATUS_TABS.map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${statusFilter === s ? "bg-orange-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-orange-400"}`}>
            {LABELS[s]} ({counts[s]})
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                <th className="px-5 py-3 text-left">Order</th>
                <th className="px-3 py-3 text-left">Customer</th>
                <th className="px-3 py-3 text-left hidden md:table-cell">Restaurant</th>
                <th className="px-3 py-3 text-left hidden sm:table-cell">Items</th>
                <th className="px-3 py-3 text-left">Status</th>
                <th className="px-3 py-3 text-right">Total</th>
                <th className="px-3 py-3 text-left hidden lg:table-cell">Time</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((o) => {
                const nextStatus = NEXT[o.status];
                return (
                  <tr key={o._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/orders/${o._id}`} className="font-mono text-xs font-bold text-gray-500 hover:text-orange-500">
                        #{orderNum(o._id)}
                      </Link>
                    </td>
                    <td className="px-3 py-3.5 font-medium text-gray-800">{customerName(o)}</td>
                    <td className="px-3 py-3.5 text-gray-500 text-xs hidden md:table-cell">{o.restaurantName}</td>
                    <td className="px-3 py-3.5 hidden sm:table-cell">
                      <p className="text-xs text-gray-500 line-clamp-1">
                        {o.items.map((i) => (i.quantity > 1 ? `${i.quantity}× ${i.name}` : i.name)).join(", ")}
                      </p>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[o.status]}`}>
                        {STATUS_LABEL[o.status]}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right font-semibold text-gray-800">${o.total.toFixed(2)}</td>
                    <td className="px-3 py-3.5 hidden lg:table-cell">
                      <span className="flex items-center gap-1 text-xs text-gray-400"><Clock size={11} /> {timeAgo(o.createdAt)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        {nextStatus && (
                          <button onClick={() => advance(o._id, o.status)}
                            className="px-2 py-1 text-[10px] font-semibold bg-gray-900 hover:bg-gray-700 text-white rounded-md transition-colors whitespace-nowrap">
                            {nextStatus === "preparing" ? "Accept" : nextStatus === "out_for_delivery" ? "Dispatch" : "Deliver"}
                          </button>
                        )}
                        <Link href={`/admin/orders/${o._id}`} className="p-1 text-gray-400 hover:text-gray-600">
                          <ChevronRight size={15} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="py-12 text-center text-sm text-gray-400">No orders found</div>}
      </div>
    </div>
  );
}
