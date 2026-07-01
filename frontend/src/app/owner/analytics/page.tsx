"use client";

import { useState, useEffect } from "react";
import { TrendingUp, ShoppingBag, DollarSign, BarChart2 } from "lucide-react";
import { ownerApi } from "@/lib/api";

type Range = "7d" | "30d";

interface DailyPoint  { _id: string; revenue: number; orders: number }
interface TopItem     { name: string; orders: number; revenue: number }
interface Totals      { revenue: number; orders: number; delivered: number; cancelled: number }

function barH(val: number, max: number, maxPx = 96): number {
  return max === 0 ? 0 : Math.max((val / max) * maxPx, 2);
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
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function BarChart({ data, color, valueKey }: {
  data: DailyPoint[];
  color: string;
  valueKey: "revenue" | "orders";
}) {
  if (!data.length) return <div className="h-28 flex items-center justify-center text-xs text-gray-400">No data yet</div>;
  const max = Math.max(...data.map((d) => d[valueKey]));
  return (
    <div className="flex items-end gap-1.5 h-28 overflow-x-auto">
      {data.map((d) => (
        <div key={d._id} className="flex flex-col items-center gap-1 min-w-[28px] flex-1">
          <div className={`w-full rounded-t-md ${color} hover:opacity-80 transition-opacity`}
            style={{ height: `${barH(d[valueKey], max)}px` }}
            title={valueKey === "revenue" ? `$${d.revenue.toFixed(0)}` : String(d.orders)}
          />
          <span className="text-[9px] text-gray-400 font-medium">{d._id}</span>
        </div>
      ))}
    </div>
  );
}

export default function OwnerAnalyticsPage() {
  const [range, setRange]     = useState<Range>("7d");
  const [daily, setDaily]     = useState<DailyPoint[]>([]);
  const [totals, setTotals]   = useState<Totals | null>(null);
  const [topItems, setTop]    = useState<TopItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const days = range === "7d" ? 7 : 30;
    ownerApi.getAnalytics(days)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => {
        setDaily((res.daily ?? []) as DailyPoint[]);
        setTotals((res.totals ?? null) as Totals | null);
        setTop((res.topItems ?? []) as TopItem[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [range]);

  const totalRevenue   = totals?.revenue  ?? 0;
  const totalOrders    = totals?.orders   ?? 0;
  const delivered      = totals?.delivered ?? 0;
  const cancelled      = totals?.cancelled ?? 0;
  const avgOrderValue  = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const completionRate = totalOrders > 0 ? (delivered / totalOrders) * 100 : 0;

  const topMax = topItems[0]?.orders ?? 1;

  const RANGES: { key: Range; label: string }[] = [
    { key: "7d",  label: "7 Days"  },
    { key: "30d", label: "30 Days" },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Revenue and order performance</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {RANGES.map(({ key, label }) => (
            <button key={key} onClick={() => setRange(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                range === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={DollarSign}  label="Total Revenue"    value={`$${totalRevenue.toFixed(2)}`}  sub={`Last ${range}`}         color="bg-green-50 text-green-600"  />
            <StatCard icon={ShoppingBag} label="Total Orders"     value={String(totalOrders)}             sub="Placed orders"            color="bg-blue-50 text-blue-600"    />
            <StatCard icon={TrendingUp}  label="Avg Order Value"  value={`$${avgOrderValue.toFixed(2)}`} sub="Per order"                color="bg-purple-50 text-purple-600" />
            <StatCard icon={BarChart2}   label="Completion Rate"  value={`${completionRate.toFixed(1)}%`} sub={`${cancelled} cancelled`} color="bg-amber-50 text-amber-600"  />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">Revenue</h2>
                <span className="text-xs text-green-600 font-semibold flex items-center gap-1"><TrendingUp size={12} /> delivered only</span>
              </div>
              <BarChart data={daily} color="bg-green-500" valueKey="revenue" />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">Orders</h2>
                <span className="text-xs text-blue-600 font-semibold flex items-center gap-1"><TrendingUp size={12} /> delivered only</span>
              </div>
              <BarChart data={daily} color="bg-blue-400" valueKey="orders" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Top Items by Orders</h2>
            </div>
            {topItems.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-400">No data yet — complete some orders first</div>
            ) : (
              <div className="p-5 space-y-3">
                {topItems.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700 truncate pr-2">{item.name}</span>
                        <span className="text-xs text-gray-500 shrink-0">{item.orders} orders</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${(item.orders / topMax) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-gray-800 shrink-0 w-16 text-right">${item.revenue.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
