"use client";

import { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Clock, MapPin, Package, ArrowRight, Home } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { orderApi } from "@/lib/api";
import type { Order } from "@/types/order";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptOrder(raw: any): Order {
  return {
    id:               String(raw._id ?? raw.id ?? ""),
    restaurantId:     String(raw.restaurantSlug ?? raw.restaurantId ?? ""),
    restaurantSlug:   raw.restaurantSlug ?? undefined,
    restaurantName:   String(raw.restaurantName ?? ""),
    restaurantImage:  String(raw.restaurantImage ?? ""),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: ((raw.items ?? []) as any[]).map((item) => ({
      menuItemId:     String(item.menuItemId ?? ""),
      name:           String(item.name ?? ""),
      image:          String(item.image ?? ""),
      price:          Number(item.price ?? 0),
      quantity:       Number(item.quantity ?? 1),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      selectedAddons: ((item.selectedAddons ?? []) as any[]).map((a, i: number) => ({
        id:    String(a._id ?? i),
        name:  String(a.name ?? ""),
        price: Number(a.price ?? 0),
      })),
    })),
    status:                raw.status ?? "placed",
    placedAt:              String(raw.placedAt ?? raw.createdAt ?? new Date().toISOString()),
    estimatedDeliveryMins: Number(raw.estimatedDeliveryMins ?? 35),
    address: {
      id:     String(raw.address?._id ?? "addr_api"),
      label:  String(raw.address?.label ?? "Home"),
      street: String(raw.address?.street ?? ""),
      city:   String(raw.address?.city ?? ""),
      zip:    String(raw.address?.zip ?? ""),
    },
    paymentMethod: raw.paymentMethod ?? "cod",
    subtotal:      Number(raw.subtotal ?? 0),
    deliveryFee:   Number(raw.deliveryFee ?? 0),
    discount:      Number(raw.discount ?? 0),
    promoCode:     raw.promoCode ?? undefined,
    total:         Number(raw.total ?? 0),
  };
}

function AnimatedCheck() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 80); return () => clearTimeout(t); }, []);
  return (
    <div className={`w-24 h-24 rounded-full bg-green-100 flex items-center justify-center transition-all duration-500 ${visible ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}>
      <CheckCircle className={`w-12 h-12 text-green-500 transition-all duration-500 delay-200 ${visible ? "scale-100 opacity-100" : "scale-0 opacity-0"}`} strokeWidth={1.5} />
    </div>
  );
}

function addonLabel(addons: Order["items"][number]["selectedAddons"]): string {
  return addons.map((a) => a.name).join(", ");
}

function OrderConfirmedContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [order, setOrder] = useState<Order | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!orderId) { setLoaded(true); return; }
    orderApi.get(orderId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ order: raw }) => setOrder(adaptOrder(raw as any)))
      .catch(() => { /* order stays null */ })
      .finally(() => setLoaded(true));
  }, [orderId]);

  const estimatedTime = order
    ? new Date(new Date(order.placedAt).getTime() + order.estimatedDeliveryMins * 60 * 1000)
        .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-start justify-center py-12 px-4">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

            <div className="bg-gradient-to-b from-green-50 to-white px-6 pt-10 pb-6 flex flex-col items-center text-center">
              <AnimatedCheck />
              <h1 className="mt-5 text-2xl font-extrabold text-gray-900">Order Placed!</h1>
              <p className="mt-2 text-sm text-gray-500 max-w-xs">
                Your order has been received and the restaurant is being notified.
              </p>
              {orderId && (
                <div className="mt-4 bg-gray-100 rounded-full px-4 py-2">
                  <span className="text-xs text-gray-500">Order ID: </span>
                  <span className="text-xs font-bold text-gray-800">{String(orderId).slice(-8).toUpperCase()}</span>
                </div>
              )}
            </div>

            {order && (
              <div className="grid grid-cols-2 divide-x divide-gray-100 border-t border-b border-gray-100">
                <div className="flex flex-col items-center py-4 gap-1">
                  <Clock className="w-4 h-4 text-[#ff6b35]" />
                  <p className="text-xs text-gray-400">Estimated arrival</p>
                  <p className="text-sm font-bold text-gray-900">{estimatedTime}</p>
                  <p className="text-xs text-gray-400">~{order.estimatedDeliveryMins} min</p>
                </div>
                <div className="flex flex-col items-center py-4 gap-1 px-3 text-center">
                  <MapPin className="w-4 h-4 text-[#ff6b35]" />
                  <p className="text-xs text-gray-400">Delivering to</p>
                  <p className="text-sm font-bold text-gray-900">{order.address.label}</p>
                  <p className="text-xs text-gray-400 truncate max-w-full">{order.address.street}</p>
                </div>
              </div>
            )}

            {order && (
              <div className="px-5 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-700">{order.restaurantName}</h3>
                </div>
                <div className="space-y-2.5">
                  {order.items.map((item, idx) => (
                    <div key={`${item.menuItemId}-${idx}`} className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                        {item.image ? (
                          <Image src={item.image} alt={item.name} fill className="object-cover" sizes="40px" />
                        ) : (
                          <div className="w-full h-full bg-gray-200" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">
                          {item.quantity > 1 && <span className="text-[#ff6b35] font-bold mr-1">×{item.quantity}</span>}
                          {item.name}
                        </p>
                        {addonLabel(item.selectedAddons) && (
                          <p className="text-[11px] text-gray-400 truncate">+ {addonLabel(item.selectedAddons)}</p>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-gray-700 shrink-0">
                        ${((item.price + item.selectedAddons.reduce((s, a) => s + a.price, 0)) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 mt-4 pt-3 space-y-1.5 text-xs text-gray-500">
                  <div className="flex justify-between"><span>Subtotal</span><span>${order.subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between">
                    <span>Delivery fee</span>
                    {order.deliveryFee === 0 ? <span className="text-green-600 font-semibold">Free</span> : <span>${order.deliveryFee.toFixed(2)}</span>}
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-green-600"><span>Discount</span><span>−${order.discount.toFixed(2)}</span></div>
                  )}
                  <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-100 text-sm">
                    <span>Total paid</span><span>${order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {loaded && !order && (
              <div className="px-6 py-4 text-center">
                <p className="text-sm text-gray-400">Order details will appear here shortly.</p>
              </div>
            )}

            <div className="px-5 pb-6 pt-2 flex flex-col sm:flex-row gap-3">
              <Link
                href={orderId ? `/orders/${orderId}` : "/orders"}
                className="flex-1 flex items-center justify-center gap-2 bg-[#ff6b35] hover:bg-[#e55a26] text-white font-semibold text-sm py-3.5 rounded-full transition-colors"
              >
                Track Order <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/"
                className="flex-1 flex items-center justify-center gap-2 border border-gray-200 bg-white hover:border-[#ff6b35] hover:text-[#ff6b35] text-gray-700 font-semibold text-sm py-3.5 rounded-full transition-colors"
              >
                <Home className="w-4 h-4" /> Back to Home
              </Link>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-5">
            Need help?{" "}
            <span className="text-[#ff6b35] cursor-pointer hover:underline">Contact support</span>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function OrderConfirmedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#ff6b35] border-t-transparent animate-spin" />
      </div>
    }>
      <OrderConfirmedContent />
    </Suspense>
  );
}
