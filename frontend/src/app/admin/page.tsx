"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Store, ShoppingBag, DollarSign, TrendingUp, ChevronRight, Clock } from "lucide-react";
import { adminApi } from "@/lib/api";

interface Stats {
  totalOrders: number; todayOrders: number; activeOrders: number;
  totalUsers: number; totalRevenue: number; todayRevenue: number;
}
interface DailyMetric { date: string; revenue: number; orders: number; users: number }
interface TopRestaurant { restaurantId: string; name: string; revenue: number; orders: number }
interface ApiOrder {
  _id: string;
  userId: { fullName: string } | null;
  restaurantName: string;
  total: number;
  status: string;
  createdAt: string;
}

const STATUS_STYLE: Record<string, string> = {
  placed:           "bg-red-100 text-red-700",
  preparing:        "bg-blue-100 text-blue-700",
  out_for_delivery: "bg-purple-100 text-purple-700",
  delivered:        "bg-green-100 text-green-700",
  cancelled:        "bg-gray-100 text-gray-500",
};
const STATUS_LABEL: Record<string, string> = {
  placed: "New", preparing: "Preparing", out_for_delivery: "En Route", delivered: "Delivered", cancelled: "Cancelled",
};

function timeAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 1)    return "just now";
  if (d < 60)   return `${d}m ago`;
  if (d < 1440) return `${Math.floor(d / 60)}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function orderNum(id: string) { return id.slice(-6).toUpperCase(); }
function customerName(o: ApiOrder) { return (o.userId as { fullName: string } | null)?.fullName ?? "Unknown"; }

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

function MiniBarChart({ data }: { data: DailyMetric[] }) {
  const last14 = data.slice(-14);
  const max = Math.max(...last14.map((d) => d.revenue), 1);
  return (
    <div className="flex items-end gap-1 h-20">
      {last14.map((d, i) => (
        <div key={i} className="flex-1 rounded-t bg-orange-400/70 hover:bg-orange-500 transition-colors"
          style={{ height: `${(d.revenue / max) * 100}%` }} title={`${d.date}: $${d.revenue.toFixed(0)}`} />
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats]             = useState<Stats | null>(null);
  const [analytics, setAnalytics]     = useState<DailyMetric[]>([]);
  const [topRests, setTopRests]       = useState<TopRestaurant[]>([]);
  const [recentOrders, setOrders]     = useState<ApiOrder[]>([]);
  const [restCount, setRestCount]     = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");

  useEffect(() => {
    Promise.all([
      adminApi.stats(),
      adminApi.analytics(30),
      adminApi.orders({ limit: 8 }),
      adminApi.restaurants(),
    ])
    .then(([s, a, o, r]) => {
      setStats(s.stats as Stats);
      setAnalytics((a.analytics as DailyMetric[]) ?? []);
      setTopRests((a.topRestaurants as TopRestaurant[]) ?? []);
      setOrders((o.orders as ApiOrder[]) ?? []);
      const rests = (r.restaurants as { isActive: boolean }[]) ?? [];
      setRestCount(rests.length);
      setActiveCount(rests.filter((x) => x.isActive).length);
    })
    .catch(() => setError("Failed to load dashboard data"))
    .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">{error}</div>
  );

  const totalRevenue30d = analytics.reduce((s, d) => s + d.revenue, 0);
  const maxRestRev = topRests[0]?.revenue ?? 1;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Platform Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">Real-time snapshot of CraveExpress</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}       label="Total Users"    value={String(stats?.totalUsers ?? 0)}       sub="registered users"                         color="bg-blue-50 text-blue-600"   />
        <StatCard icon={Store}       label="Restaurants"    value={String(restCount)}                    sub={`${activeCount} active`}                  color="bg-purple-50 text-purple-600"/>
        <StatCard icon={ShoppingBag} label="Total Orders"   value={(stats?.totalOrders ?? 0).toLocaleString()} sub={`+${stats?.todayOrders ?? 0} today`}   color="bg-orange-50 text-orange-500"/>
        <StatCard icon={DollarSign}  label="Total Revenue"  value={`$${(stats?.totalRevenue ?? 0).toLocaleString()}`} sub={`$${(stats?.todayRevenue ?? 0).toFixed(2)} today`} color="bg-green-50 text-green-600"/>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Orders</h2>
            <Link href="/admin/orders" className="text-xs text-orange-500 hover:underline font-medium flex items-center gap-1">
              View all <ChevronRight size={13} />
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">No orders yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                    <th className="px-5 py-3 text-left">Order</th>
                    <th className="px-3 py-3 text-left">Customer</th>
                    <th className="px-3 py-3 text-left hidden md:table-cell">Restaurant</th>
                    <th className="px-3 py-3 text-left">Status</th>
                    <th className="px-3 py-3 text-right">Total</th>
                    <th className="px-5 py-3 text-right hidden sm:table-cell">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentOrders.map((o) => (
                    <tr key={o._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <Link href={`/admin/orders/${o._id}`} className="font-mono text-xs font-bold text-gray-500 hover:text-orange-500">
                          #{orderNum(o._id)}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-gray-700 font-medium">{customerName(o)}</td>
                      <td className="px-3 py-3 text-gray-500 hidden md:table-cell text-xs">{o.restaurantName}</td>
                      <td className="px-3 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[o.status] ?? "bg-gray-100 text-gray-500"}`}>
                          {STATUS_LABEL[o.status] ?? o.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-gray-800">${o.total.toFixed(2)}</td>
                      <td className="px-5 py-3 text-right text-xs text-gray-400 hidden sm:table-cell">
                        <span className="flex items-center gap-1 justify-end"><Clock size={11} />{timeAgo(o.createdAt)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-gray-900 text-sm">Revenue (30d)</h2>
            <span className="text-xs text-green-600 font-semibold flex items-center gap-1"><TrendingUp size={12} />delivered</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-4">
            ${totalRevenue30d.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          {analytics.length > 0 ? (
            <MiniBarChart data={analytics} />
          ) : (
            <div className="h-20 flex items-center justify-center text-xs text-gray-400">No data yet</div>
          )}
          <Link href="/admin/analytics" className="mt-4 flex items-center justify-center gap-1 text-xs text-orange-500 hover:underline font-medium">
            Full analytics <ChevronRight size={12} />
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Top Restaurants by Revenue</h2>
          <Link href="/admin/restaurants" className="text-xs text-orange-500 hover:underline font-medium flex items-center gap-1">
            Manage <ChevronRight size={13} />
          </Link>
        </div>
        {topRests.length === 0 ? (
          <div className="p-5 text-center text-sm text-gray-400">No delivered orders yet</div>
        ) : (
          <div className="p-5 space-y-4">
            {topRests.map((r, i) => (
              <div key={r.restaurantId} className="flex items-center gap-4">
                <span className="text-xs font-bold text-gray-400 w-4 shrink-0">{i + 1}</span>
                <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                  <span className="text-sm">{["🍕","🍔","🥗","🍣","🌮","🍰","🥤","🍛"][i % 8]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-800 truncate pr-2">{r.name}</span>
                    <span className="text-xs font-bold text-gray-800 shrink-0">${r.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-orange-400" style={{ width: `${(r.revenue / maxRestRev) * 100}%` }} />
                  </div>
                </div>
                <span className="text-xs text-gray-400 shrink-0 hidden sm:block">{r.orders} orders</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
