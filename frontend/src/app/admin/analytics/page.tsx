"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Users, ShoppingBag, DollarSign, Store } from "lucide-react";
import { adminApi } from "@/lib/api";

type Range = "7d" | "30d";

interface DailyMetric { date: string; revenue: number; orders: number; users: number }
interface TopRestaurant { restaurantId: string; name: string; revenue: number; orders: number }
interface Stats {
  totalUsers: number; totalOrders: number; totalRevenue: number;
  todayOrders: number; activeOrders: number;
}

function barH(val: number, max: number, maxPx = 80): number {
  return max === 0 ? 0 : (val / max) * maxPx;
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub: string; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-xs text-gray-400 mt-1">{sub}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}><Icon size={20} /></div>
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [range, setRange]           = useState<Range>("30d");
  const [analytics, setAnalytics]   = useState<DailyMetric[]>([]);
  const [topRests, setTopRests]     = useState<TopRestaurant[]>([]);
  const [stats, setStats]           = useState<Stats | null>(null);
  const [restCount, setRestCount]   = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      adminApi.analytics(range === "7d" ? 7 : 30),
      adminApi.stats(),
      adminApi.restaurants(),
    ])
    .then(([a, s, r]) => {
      setAnalytics((a.analytics as DailyMetric[]) ?? []);
      setTopRests((a.topRestaurants as TopRestaurant[]) ?? []);
      setStats(s.stats as Stats);
      setRestCount(((r.restaurants as unknown[]) ?? []).length);
    })
    .catch(() => setError("Failed to load analytics"))
    .finally(() => setLoading(false));
  }, [range]);

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
    </div>
  );

  if (error) return <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">{error}</div>;

  const data = analytics;
  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const totalOrders  = data.reduce((s, d) => s + d.orders, 0);
  const totalUsers   = data.reduce((s, d) => s + d.users, 0);
  const avgOrder     = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const maxRev    = Math.max(...data.map((d) => d.revenue), 1);
  const maxOrders = Math.max(...data.map((d) => d.orders), 1);

  const maxRestRev = topRests[0]?.revenue ?? 1;

  const delivered = stats?.totalOrders ? stats.totalOrders - (stats.activeOrders ?? 0) : 0;
  const active    = stats?.activeOrders ?? 0;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Platform Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Full-platform metrics and performance</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(["7d","30d"] as const).map((r) => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${range === r ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {r === "7d" ? "7 Days" : "30 Days"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign}  label="Revenue"         value={`$${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub={`Past ${range}`}   color="bg-green-50 text-green-600"  />
        <StatCard icon={ShoppingBag} label="Orders"          value={totalOrders.toLocaleString()}                                                sub="Delivered orders" color="bg-orange-50 text-orange-500" />
        <StatCard icon={Users}       label="New Users"        value={String(totalUsers)}                                                          sub="Signups in period" color="bg-blue-50 text-blue-600"    />
        <StatCard icon={Store}       label="Avg Order Value"  value={`$${avgOrder.toFixed(2)}`}                                                  sub="Revenue per order" color="bg-purple-50 text-purple-600" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Revenue</h2>
            {data.length > 1 && (
              <span className="text-xs text-green-600 font-semibold flex items-center gap-1"><TrendingUp size={12} />delivered orders</span>
            )}
          </div>
          {data.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No data for this period</p>
          ) : (
            <div className="flex items-end gap-1 h-24 overflow-x-auto">
              {data.map((d) => (
                <div key={d.date} className="flex flex-col items-center gap-1 min-w-[16px] flex-1">
                  <div className="w-full rounded-t bg-orange-400 hover:bg-orange-500 transition-colors"
                    style={{ height: `${barH(d.revenue, maxRev)}px` }} title={`$${d.revenue.toFixed(0)}`} />
                  {data.length <= 10 && <span className="text-[9px] text-gray-400">{d.date}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Orders</h2>
          </div>
          {data.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No data for this period</p>
          ) : (
            <div className="flex items-end gap-1 h-24 overflow-x-auto">
              {data.map((d) => (
                <div key={d.date} className="flex flex-col items-center gap-1 min-w-[16px] flex-1">
                  <div className="w-full rounded-t bg-blue-400 hover:bg-blue-500 transition-colors"
                    style={{ height: `${barH(d.orders, maxOrders)}px` }} title={String(d.orders)} />
                  {data.length <= 10 && <span className="text-[9px] text-gray-400">{d.date}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-900">Top Restaurants by Revenue</h2></div>
          <div className="p-5 space-y-4">
            {topRests.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No data yet</p>
            ) : topRests.map((r, i) => (
              <div key={r.restaurantId} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 w-4 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700 truncate pr-2">{r.name}</span>
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
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-900">Platform Overview</h2></div>
          <div className="p-5 space-y-4">
            {stats && (
              <>
                {[
                  { label: "Delivered",    count: delivered, color: "bg-green-500",  pct: stats.totalOrders > 0 ? (delivered / stats.totalOrders) * 100 : 0 },
                  { label: "Active",       count: active,    color: "bg-blue-400",   pct: stats.totalOrders > 0 ? (active / stats.totalOrders) * 100 : 0 },
                ].map(({ label, count, color, pct }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`} />
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-gray-600">{label}</span>
                        <span className="text-xs font-semibold text-gray-800">{count} ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="mt-2 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <p className="text-xs text-gray-500">Total Users</p>
                    <p className="text-lg font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <p className="text-xs text-gray-500">Restaurants</p>
                    <p className="text-lg font-bold text-gray-900">{restCount}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
