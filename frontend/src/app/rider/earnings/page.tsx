"use client";

import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, Bike, Calendar } from "lucide-react";
import { riderApi } from "@/lib/api";

interface PeriodStats { earnings: number; deliveries: number }
interface DailyPoint  { date: string; earnings: number; deliveries: number }

interface EarningsData {
  today:   PeriodStats;
  week:    PeriodStats;
  month:   PeriodStats;
  allTime: PeriodStats;
  daily:   DailyPoint[];
}

export default function EarningsPage() {
  const [data, setData]     = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    riderApi.earnings()
      .then((r) => setData(r as EarningsData))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-[#ff6b35] border-t-transparent animate-spin" />
      </div>
    );
  }

  const maxEarning = Math.max(...data.daily.map((d) => d.earnings), 1);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Earnings</h1>
        <p className="text-sm text-gray-500 mt-1">Track your delivery income</p>
      </div>

      {/* Period cards */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Today",     icon: Calendar,  ...data.today,   accent: "bg-[#fff3ef] text-[#ff6b35]" },
          { label: "This Week", icon: TrendingUp, ...data.week,   accent: "bg-blue-50 text-blue-600" },
          { label: "This Month", icon: DollarSign, ...data.month, accent: "bg-green-50 text-green-600" },
          { label: "All Time",  icon: Bike,      ...data.allTime, accent: "bg-purple-50 text-purple-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${stat.accent}`}>
              <stat.icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900">${stat.earnings.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            <p className="text-xs text-gray-400 mt-1">{stat.deliveries} deliveries</p>
          </div>
        ))}
      </div>

      {/* Weekly chart */}
      {data.daily.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-5">Last 7 Days</h2>
          <div className="flex items-end gap-2 h-32">
            {data.daily.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-gray-400 font-medium">
                  {d.earnings > 0 ? `$${d.earnings.toFixed(0)}` : ""}
                </span>
                <div
                  className="w-full rounded-t-lg bg-[#ff6b35] transition-all"
                  style={{ height: `${(d.earnings / maxEarning) * 100}%`, minHeight: d.earnings > 0 ? "4px" : "0" }}
                />
                <span className="text-[10px] text-gray-400">{d.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rate breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-bold text-gray-900 mb-3">How You Earn</h2>
        <div className="space-y-3">
          {[
            { label: "Delivery fee share",    value: "80% of each delivery fee", color: "text-green-600" },
            { label: "Tips",                  value: "100% yours (COD tip at door)", color: "text-blue-600" },
            { label: "Platform service fee",  value: "20% of delivery fee",      color: "text-gray-500" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <p className="text-sm text-gray-600">{item.label}</p>
              <p className={`text-sm font-semibold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
