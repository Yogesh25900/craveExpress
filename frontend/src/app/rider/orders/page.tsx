"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { MapPin, Clock, Package, DollarSign, RefreshCw, ChevronRight } from "lucide-react";
import { riderApi } from "@/lib/api";

interface AvailableOrder {
  _id: string;
  restaurantName: string;
  restaurantImage: string;
  restaurantAddress: string;
  restaurantLocation?: { coordinates: [number, number] } | null;
  address: { label: string; street: string; city: string; zip: string };
  total: number;
  deliveryFee: number;
  items: { name: string; quantity: number; price: number }[];
  createdAt: string;
  placedAt: string;
}

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

export default function RiderRequestsPage() {
  const [orders, setOrders]   = useState<AvailableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const load = useCallback(() => {
    setLoading(true);
    riderApi.availableOrders()
      .then((r) => setOrders((r as { orders: AvailableOrder[] }).orders))
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Requests</h1>
          <p className="text-sm text-gray-500 mt-1">
            Go <span className="text-green-600 font-semibold">Online</span> to receive instant request popups · or browse ready orders below
          </p>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors bg-white border border-gray-200 rounded-xl px-4 py-2.5"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* How it works */}
      <div className="bg-[#fff3ef] border border-[#ff6b35]/20 rounded-2xl p-4">
        <p className="text-sm font-semibold text-[#ff6b35] mb-2">How delivery requests work</p>
        <ol className="space-y-1 text-xs text-gray-600 list-decimal list-inside">
          <li>Toggle yourself <strong>Online</strong> using the button in the sidebar</li>
          <li>When a restaurant marks food <strong>Ready for Pickup</strong>, you get an instant popup</li>
          <li>First rider to tap <strong>Accept</strong> gets the order</li>
          <li>Or browse orders below that are still waiting for a rider</li>
        </ol>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-600">{error}</div>
      )}

      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">
          Orders waiting for a rider{orders.length > 0 && ` (${orders.length})`}
        </p>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-[#ff6b35] border-t-transparent animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-500">No orders waiting</p>
            <p className="text-sm text-gray-400 mt-1">Go online to be notified instantly when one appears</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 p-4 border-b border-gray-50">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                    {order.restaurantImage ? (
                      <Image src={order.restaurantImage} alt={order.restaurantName} fill className="object-cover" sizes="48px" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#ff6b35] to-[#e55a26] flex items-center justify-center text-white font-bold text-lg">
                        {order.restaurantName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{order.restaurantName}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> {order.restaurantAddress || "Restaurant location"}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" /> {timeAgo(order.createdAt ?? order.placedAt)}
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <Package className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-gray-600">
                      {order.items.slice(0, 3).map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                      {order.items.length > 3 && ` +${order.items.length - 3} more`}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-orange-50 rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide mb-1">Pickup</p>
                      <p className="text-xs font-semibold text-gray-900 truncate">{order.restaurantName}</p>
                      <p className="text-xs text-gray-500 truncate">{order.restaurantAddress || "See map"}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-1">Deliver to</p>
                      <p className="text-xs font-semibold text-gray-900 truncate">{order.address.label}</p>
                      <p className="text-xs text-gray-500 truncate">{order.address.street}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Order Total</p>
                        <p className="text-sm font-bold text-gray-900">${order.total.toFixed(2)}</p>
                      </div>
                      <div className="w-px h-8 bg-gray-200" />
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Your Earn</p>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-green-600" />
                          <p className="text-sm font-bold text-green-600">${(order.deliveryFee * 0.8).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                    <a href={`/rider/deliveries`}
                      className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                    >
                      View active <ChevronRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
