"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShoppingBag, Bike, DollarSign, Clock, ChevronRight,
  CheckCircle, Package, TrendingUp,
} from "lucide-react";
import { riderApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface EarningStats {
  earnings: number;
  deliveries: number;
}

interface ActiveOrder {
  _id: string;
  restaurantName: string;
  restaurantImage: string;
  status: string;
  total: number;
  address: { street: string; city: string };
  items: { quantity: number }[];
}

interface AvailableOrder {
  _id: string;
  restaurantName: string;
  restaurantAddress: string;
  address: { street: string; city: string };
  total: number;
  deliveryFee: number;
  items: { quantity: number }[];
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  placed:           "Order Placed",
  preparing:        "Restaurant Preparing",
  out_for_delivery: "Out for Delivery",
  delivered:        "Delivered",
};

const STATUS_COLOR: Record<string, string> = {
  placed:           "bg-yellow-100 text-yellow-700",
  preparing:        "bg-blue-100 text-blue-700",
  out_for_delivery: "bg-orange-100 text-orange-700",
  delivered:        "bg-green-100 text-green-700",
};

export default function RiderDashboard() {
  const { user } = useAuth();
  const [today, setToday]           = useState<EarningStats>({ earnings: 0, deliveries: 0 });
  const [allTime, setAllTime]       = useState<EarningStats>({ earnings: 0, deliveries: 0 });
  const [activeOrder, setActive]    = useState<ActiveOrder | null>(null);
  const [available, setAvailable]   = useState<AvailableOrder[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      riderApi.earnings().then((r) => {
        const e = r as { today: EarningStats; allTime: EarningStats };
        setToday(e.today);
        setAllTime(e.allTime);
      }).catch(() => {}),
      riderApi.activeOrder().then((r) => {
        setActive((r as { order: ActiveOrder | null }).order);
      }).catch(() => {}),
      riderApi.availableOrders().then((r) => {
        setAvailable(((r as { orders: AvailableOrder[] }).orders).slice(0, 5));
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const hour   = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-[#ff6b35] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <p className="text-sm text-gray-500">{greeting}</p>
        <h1 className="text-2xl font-bold text-gray-900">{user?.fullName} 👋</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Earnings", value: `$${today.earnings.toFixed(2)}`, icon: DollarSign, color: "bg-green-100 text-green-600" },
          { label: "Deliveries Today", value: String(today.deliveries), icon: Bike, color: "bg-[#fff3ef] text-[#ff6b35]" },
          { label: "All-time Earnings", value: `$${allTime.earnings.toFixed(2)}`, icon: TrendingUp, color: "bg-blue-100 text-blue-600" },
          { label: "Total Deliveries", value: String(allTime.deliveries), icon: CheckCircle, color: "bg-purple-100 text-purple-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
              <stat.icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Active delivery */}
      {activeOrder ? (
        <div className="bg-white rounded-2xl border border-[#ff6b35]/30 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#ff6b35] animate-pulse" />
              <h2 className="font-bold text-gray-900">Active Delivery</h2>
            </div>
            <Link href="/rider/deliveries" className="text-sm text-[#ff6b35] font-semibold flex items-center gap-1 hover:underline">
              Open <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ff6b35] flex items-center justify-center text-white text-sm font-bold shrink-0">
              {activeOrder.restaurantName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{activeOrder.restaurantName}</p>
              <p className="text-xs text-gray-500 mt-0.5">{activeOrder.address.street}, {activeOrder.address.city}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {activeOrder.items.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0)} items · ${activeOrder.total.toFixed(2)}
              </p>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLOR[activeOrder.status] ?? "bg-gray-100 text-gray-600"}`}>
              {STATUS_LABEL[activeOrder.status] ?? activeOrder.status}
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-3 text-gray-400">
          <Bike className="w-5 h-5" />
          <p className="text-sm">No active delivery — check available orders below</p>
        </div>
      )}

      {/* Available orders preview */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-[#ff6b35]" />
            <h2 className="font-bold text-gray-900">Available Orders</h2>
            {available.length > 0 && (
              <span className="bg-[#ff6b35] text-white text-xs font-bold px-2 py-0.5 rounded-full">{available.length}</span>
            )}
          </div>
          <Link href="/rider/orders" className="text-sm text-[#ff6b35] font-semibold flex items-center gap-1 hover:underline">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {available.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No available orders right now</p>
        ) : (
          <div className="space-y-3">
            {available.map((order) => (
              <div key={order._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{order.restaurantName}</p>
                  <p className="text-xs text-gray-500 truncate">{order.address.street}, {order.address.city}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">${order.total.toFixed(2)}</p>
                  <p className="text-xs text-green-600">+${order.deliveryFee.toFixed(2)} fee</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { href: "/rider/orders",   icon: ShoppingBag, label: "Available Orders", color: "from-[#ff6b35] to-[#e55a26]" },
          { href: "/rider/history",  icon: History,     label: "Delivery History", color: "from-gray-700 to-gray-900" },
          { href: "/rider/earnings", icon: DollarSign,  label: "My Earnings",      color: "from-green-600 to-emerald-700" },
        ].map(({ href, icon: Icon, label, color }) => (
          <Link
            key={href}
            href={href}
            className={`bg-gradient-to-br ${color} p-4 rounded-2xl flex flex-col gap-2 text-white hover:opacity-90 transition-opacity`}
          >
            <Icon className="w-5 h-5" />
            <p className="text-xs font-semibold">{label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function History(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}
