"use client";

import { useEffect, useState, useCallback } from "react";
import { Package, MapPin, CheckCircle, XCircle, ChevronDown } from "lucide-react";
import { riderApi } from "@/lib/api";

interface HistoryOrder {
  _id: string;
  restaurantName: string;
  restaurantImage: string;
  address: { street: string; city: string };
  total: number;
  deliveryFee: number;
  subtotal: number;
  items: { name: string; quantity: number }[];
  status: "delivered" | "cancelled";
  placedAt: string;
  updatedAt: string;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export default function HistoryPage() {
  const [orders, setOrders]     = useState<HistoryOrder[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [loadMore, setLoadMore] = useState(false);
  const LIMIT = 15;

  const load = useCallback((p: number, append: boolean) => {
    const setter = append ? setLoadMore : setLoading;
    setter(true);
    riderApi.history({ page: p, limit: LIMIT })
      .then((r) => {
        const res = r as { orders: HistoryOrder[]; total: number };
        setOrders((prev) => append ? [...prev, ...res.orders] : res.orders);
        setTotal(res.total);
      })
      .catch(() => {})
      .finally(() => setter(false));
  }, []);

  useEffect(() => { load(1, false); }, [load]);

  function handleLoadMore() {
    const next = page + 1;
    setPage(next);
    load(next, true);
  }

  const hasMore = orders.length < total;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-[#ff6b35] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Delivery History</h1>
        <p className="text-sm text-gray-500 mt-1">{total} total deliveries</p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-500">No delivery history yet</p>
          <p className="text-sm text-gray-400 mt-1">Your completed deliveries will appear here</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    order.status === "delivered" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                  }`}>
                    {order.status === "delivered"
                      ? <CheckCircle className="w-5 h-5" />
                      : <XCircle className="w-5 h-5" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-gray-900 truncate">{order.restaurantName}</p>
                      <span className={`text-xs font-semibold shrink-0 px-2 py-0.5 rounded-full ${
                        order.status === "delivered" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {order.status === "delivered" ? "Delivered" : "Cancelled"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {order.address.street}, {order.address.city}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-400">{fmtDate(order.updatedAt)} · {fmtTime(order.updatedAt)}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">${order.total.toFixed(2)} order</span>
                        {order.status === "delivered" && (
                          <span className="text-sm font-bold text-green-600">+${(order.deliveryFee * 0.8).toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={loadMore}
                className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 border border-gray-200 bg-white rounded-xl px-5 py-2.5 transition-colors"
              >
                {loadMore ? (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
                ) : <ChevronDown className="w-4 h-4" />}
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
