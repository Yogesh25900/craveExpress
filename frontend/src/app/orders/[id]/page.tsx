"use client";

import { use, useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Clock, MapPin, Phone, Star, Package,
  CheckCircle, ChefHat, Bike, Home as HomeIcon, XCircle, Navigation,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import OrderStatusBadge from "@/components/ui/OrderStatusBadge";
import { orderApi, restaurantApi } from "@/lib/api";
import { useOrderSSE } from "@/hooks/useOrderSSE";
import type { Order, OrderStatus } from "@/types/order";

const OrderTrackingMap = dynamic(
  () => import("@/components/map/OrderTrackingMap"),
  { ssr: false, loading: () => <div className="h-56 bg-gray-100 animate-pulse" /> }
);

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
    notes:         raw.notes ?? undefined,
    // Rider fields
    riderId:       raw.riderId ?? undefined,
    riderName:     raw.riderName ?? undefined,
    riderPhone:    raw.riderPhone ?? undefined,
    riderLocation: raw.riderLocation ?? undefined,
    assignedAt:    raw.assignedAt ?? undefined,
  };
}

const STATUS_STEPS: { key: OrderStatus; label: string; description: string; icon: React.ReactNode }[] = [
  { key: "placed",           label: "Order Placed",    description: "Your order has been received",                    icon: <CheckCircle className="w-5 h-5" /> },
  { key: "accepted",         label: "Accepted",        description: "Restaurant accepted your order",                  icon: <CheckCircle className="w-5 h-5" /> },
  { key: "preparing",        label: "Preparing",       description: "The restaurant is cooking your food",             icon: <ChefHat className="w-5 h-5" /> },
  { key: "ready_for_pickup", label: "Ready",           description: "Food is ready — finding a rider",                 icon: <Package className="w-5 h-5" /> },
  { key: "picked_up",        label: "Picked Up",       description: "Rider collected your order",                      icon: <Bike className="w-5 h-5" /> },
  { key: "out_for_delivery", label: "On the Way",      description: "Your delivery partner is heading to you",         icon: <Bike className="w-5 h-5" /> },
  { key: "delivered",        label: "Delivered",       description: "Order delivered successfully",                    icon: <HomeIcon className="w-5 h-5" /> },
];

const ACTIVE_STATUSES: OrderStatus[] = ["placed", "accepted", "preparing", "ready_for_pickup", "picked_up", "out_for_delivery", "delivered"];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function estimatedArrival(order: Order) {
  return new Date(
    new Date(order.placedAt).getTime() + order.estimatedDeliveryMins * 60 * 1000
  ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function StatusTracker({ status }: { status: OrderStatus }) {
  const activeIdx = ACTIVE_STATUSES.indexOf(status);

  if (status === "cancelled" || status === "rejected") {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl">
        <XCircle className="w-6 h-6 text-red-500 shrink-0" />
        <div>
          <p className="font-semibold text-red-600">
            {status === "rejected" ? "Order Rejected" : "Order Cancelled"}
          </p>
          <p className="text-xs text-red-400 mt-0.5">
            {status === "rejected" ? "The restaurant couldn't accept this order." : "This order has been cancelled."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-100" />
      <div className="space-y-0">
        {STATUS_STEPS.map((step, idx) => {
          const isDone    = idx < activeIdx;
          const isCurrent = idx === activeIdx;
          return (
            <div key={step.key} className="flex items-start gap-4 py-3 relative">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 transition-all ${
                isDone ? "bg-green-100 text-green-600" : isCurrent ? "bg-[#ff6b35] text-white shadow-lg shadow-[#ff6b35]/30" : "bg-gray-100 text-gray-300"
              }`}>
                {isDone ? <CheckCircle className="w-5 h-5" /> : step.icon}
              </div>
              <div className="pt-1.5">
                <p className={`text-sm font-semibold ${isCurrent ? "text-[#ff6b35]" : isDone ? "text-gray-700" : "text-gray-300"}`}>
                  {step.label}
                  {isCurrent && <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-[#ff6b35] animate-pulse align-middle" />}
                </p>
                <p className={`text-xs mt-0.5 ${idx > activeIdx ? "text-gray-300" : "text-gray-400"}`}>{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [order, setOrder]           = useState<Order | null>(null);
  const [loaded, setLoaded]         = useState(false);
  const [restLat, setRestLat]       = useState<number | undefined>();
  const [restLng, setRestLng]       = useState<number | undefined>();
  const [riderLat, setRiderLat]     = useState<number | undefined>();
  const [riderLng, setRiderLng]     = useState<number | undefined>();
  const [riderName, setRiderName]   = useState<string | undefined>();
  const [riderPhone, setRiderPhone] = useState<string | undefined>();

  useEffect(() => {
    orderApi.get(id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ order: raw }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const adapted = adaptOrder(raw as any);
        setOrder(adapted);
        // Hydrate rider fields from fetched order
        if (adapted.riderName)  setRiderName(adapted.riderName);
        if (adapted.riderPhone) setRiderPhone(adapted.riderPhone);
        if (adapted.riderLocation) {
          setRiderLat(adapted.riderLocation.lat);
          setRiderLng(adapted.riderLocation.lng);
        }
        // Fetch restaurant location
        if (adapted.restaurantSlug) {
          restaurantApi.get(adapted.restaurantSlug)
            .then(({ restaurant }) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const r = restaurant as any;
              if (r?.location?.coordinates) {
                setRestLng(r.location.coordinates[0]);
                setRestLat(r.location.coordinates[1]);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => setOrder(null))
      .finally(() => setLoaded(true));
  }, [id]);

  // Live SSE updates
  const handleStatusChange = useCallback((status: string) => {
    setOrder((prev) => prev ? { ...prev, status: status as OrderStatus } : prev);
  }, []);

  const handleRiderLocation = useCallback((lat: number, lng: number) => {
    setRiderLat(lat);
    setRiderLng(lng);
  }, []);

  const handleRiderAssigned = useCallback((name: string, phone: string) => {
    setRiderName(name);
    setRiderPhone(phone);
    setOrder((prev) => prev ? { ...prev, riderName: name, riderPhone: phone } : prev);
  }, []);

  useOrderSSE(
    loaded && order ? id : undefined,
    {
      onStatusChange:  handleStatusChange,
      onRiderLocation: handleRiderLocation,
      onRiderAssigned: handleRiderAssigned,
    }
  );

  if (!loaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#ff6b35] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-gray-500 text-sm">Order not found.</p>
        <Link href="/orders" className="text-[#ff6b35] text-sm font-semibold hover:underline">← Back to orders</Link>
      </div>
    );
  }

  const isActive  = !["delivered", "cancelled", "rejected"].includes(order.status);
  const hasRider  = !!(riderName ?? order.riderName);
  const isOnTheWay = order.status === "out_for_delivery";
  const showMap   = !!(restLat && restLng) || !!(riderLat && riderLng);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:border-[#ff6b35] hover:text-[#ff6b35] transition-colors text-gray-600"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Order Tracking</h1>
              <p className="text-xs text-gray-400">{String(order.id).slice(-8).toUpperCase()}</p>
            </div>
            <div className="ml-auto">
              <OrderStatusBadge status={order.status} />
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-5">

            {/* Left column */}
            <div className="flex-1 space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-bold text-gray-900 mb-4">Order Status</h2>
                <StatusTracker status={order.status} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-[#ff6b35] mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-semibold">Estimated arrival</span>
                  </div>
                  <p className="text-lg font-extrabold text-gray-900">{estimatedArrival(order)}</p>
                  <p className="text-xs text-gray-400">~{order.estimatedDeliveryMins} min · placed at {formatTime(order.placedAt)}</p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-[#ff6b35] mb-1">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs font-semibold">Delivering to</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900">{order.address.label}</p>
                  <p className="text-xs text-gray-400 leading-tight">{order.address.street}<br />{order.address.city} {order.address.zip}</p>
                </div>
              </div>

              {/* Live map */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {showMap ? (
                  <>
                    <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Navigation className={`w-4 h-4 ${isOnTheWay && riderLat ? "text-[#ff6b35] animate-pulse" : "text-gray-400"}`} />
                        <span className="text-sm font-semibold text-gray-900">
                          {isOnTheWay && riderLat ? "Live tracking" : "Route map"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[#ff6b35] inline-block" /> Restaurant
                        </span>
                        {riderLat && (
                          <span className="flex items-center gap-1">
                            <span className="text-sm">🛵</span> Rider
                          </span>
                        )}
                      </div>
                    </div>
                    <OrderTrackingMap
                      restaurantLat={restLat}
                      restaurantLng={restLng}
                      restaurantName={order.restaurantName}
                      restaurantImage={order.restaurantImage}
                      riderLat={riderLat}
                      riderLng={riderLng}
                      riderName={riderName ?? order.riderName}
                      className="h-56 w-full"
                    />
                  </>
                ) : (
                  <div className="h-44 bg-gradient-to-br from-gray-100 to-gray-50 flex flex-col items-center justify-center gap-2 relative">
                    <div className="w-10 h-10 rounded-full bg-[#ff6b35]/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-[#ff6b35]" />
                    </div>
                    <p className="text-sm font-semibold text-gray-500">Map will appear once rider is assigned</p>
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-1/3 left-0 right-0 h-px bg-gray-400" />
                      <div className="absolute top-2/3 left-0 right-0 h-px bg-gray-400" />
                      <div className="absolute left-1/4 top-0 bottom-0 w-px bg-gray-400" />
                      <div className="absolute left-2/3 top-0 bottom-0 w-px bg-gray-400" />
                    </div>
                  </div>
                )}
              </div>

              {/* Delivery partner card */}
              {isActive && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Delivery Partner</h3>
                  {hasRider ? (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#ff6b35] flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {(riderName ?? order.riderName ?? "R").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{riderName ?? order.riderName}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="text-xs text-gray-500">4.8</span>
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-400">
                            {isOnTheWay ? "On the way" : "Assigned"}
                          </span>
                        </div>
                      </div>
                      {(riderPhone ?? order.riderPhone) && (
                        <a
                          href={`tel:${riderPhone ?? order.riderPhone}`}
                          className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center hover:bg-green-100 transition-colors"
                        >
                          <Phone className="w-4 h-4 text-green-600" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-gray-400">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                        <Bike className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Finding a delivery partner…</p>
                        <p className="text-xs text-gray-400 mt-0.5">You'll be notified when assigned</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right column */}
            <div className="w-full lg:w-72 shrink-0 space-y-4">

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                  {order.restaurantImage ? (
                    <Image src={order.restaurantImage} alt={order.restaurantName} fill className="object-cover" sizes="48px" />
                  ) : (
                    <div className="w-full h-full bg-gray-200" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{order.restaurantName}</p>
                  {order.restaurantSlug && (
                    <Link href={`/restaurants/${order.restaurantSlug}`} className="text-xs text-[#ff6b35] hover:underline">
                      View menu
                    </Link>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-bold text-gray-900">{order.items.reduce((s, i) => s + i.quantity, 0)} items</h3>
                </div>

                <div className="space-y-2.5">
                  {order.items.map((item, idx) => (
                    <div key={`${item.menuItemId}-${idx}`} className="flex items-center gap-2.5">
                      <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                        {item.image ? (
                          <Image src={item.image} alt={item.name} fill className="object-cover" sizes="36px" />
                        ) : (
                          <div className="w-full h-full bg-gray-200" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">
                          {item.quantity > 1 && <span className="text-[#ff6b35] mr-1">×{item.quantity}</span>}
                          {item.name}
                        </p>
                        {item.selectedAddons.length > 0 && (
                          <p className="text-[10px] text-gray-400 truncate">+ {item.selectedAddons.map((a) => a.name).join(", ")}</p>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-gray-700 shrink-0">
                        ${((item.price + item.selectedAddons.reduce((s, a) => s + a.price, 0)) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                {order.notes && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500"><span className="font-semibold text-gray-700">Note:</span> {order.notes}</p>
                  </div>
                )}

                <div className="border-t border-gray-100 mt-3 pt-3 space-y-1.5 text-xs text-gray-500">
                  <div className="flex justify-between"><span>Subtotal</span><span>${order.subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between">
                    <span>Delivery</span>
                    {order.deliveryFee === 0 ? <span className="text-green-600 font-semibold">Free</span> : <span>${order.deliveryFee.toFixed(2)}</span>}
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-green-600"><span>Discount</span><span>−${order.discount.toFixed(2)}</span></div>
                  )}
                  <div className="flex justify-between font-bold text-gray-900 text-sm pt-1 border-t border-gray-100">
                    <span>Total</span><span>${order.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400 pt-0.5">
                    <span>Payment</span>
                    <span className="capitalize">{order.paymentMethod === "cod" ? "Cash on delivery" : "Card"}</span>
                  </div>
                </div>
              </div>

              <Link href="/orders" className="block text-center text-sm text-gray-400 hover:text-[#ff6b35] transition-colors py-1">
                ← All Orders
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
