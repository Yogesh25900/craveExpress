"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  MapPin, Phone, Package, CheckCircle, Navigation, Loader2,
  AlertCircle, ArrowRight, Clock,
} from "lucide-react";
import { riderApi } from "@/lib/api";

const OrderTrackingMap = dynamic(
  () => import("@/components/map/RiderDeliveryMap"),
  { ssr: false, loading: () => <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" /> }
);

interface ActiveOrder {
  _id: string;
  restaurantName: string;
  restaurantImage: string;
  restaurantAddress: string;
  restaurantLocation?: { type: string; coordinates: [number, number] } | null;
  address: { label: string; street: string; city: string; zip: string };
  total: number;
  deliveryFee: number;
  subtotal: number;
  items: { name: string; image?: string; quantity: number; price: number; selectedAddons: { name: string; price: number }[] }[];
  status: string;
  riderName?: string;
  riderPhone?: string;
  placedAt: string;
  notes?: string;
}

const STATUS_STEP: Record<string, number> = {
  ready_for_pickup: 0, picked_up: 1, out_for_delivery: 2, delivered: 3,
};

const STATUS_LABEL: Record<string, string> = {
  ready_for_pickup: "Head to restaurant for pickup",
  picked_up:        "Heading to customer",
  out_for_delivery: "Out for delivery — send live location",
  delivered:        "Delivered!",
};

export default function ActiveDeliveryPage() {
  const [order, setOrder]         = useState<ActiveOrder | null>(null);
  const [loading, setLoading]     = useState(true);
  const [updating, setUpdating]   = useState(false);
  const [error, setError]         = useState("");
  const [riderLat, setRiderLat]   = useState<number | undefined>();
  const [riderLng, setRiderLng]   = useState<number | undefined>();
  const watchRef                  = useRef<number | null>(null);
  const locationTimer             = useRef<NodeJS.Timeout | null>(null);

  const load = useCallback(() => {
    riderApi.activeOrder()
      .then((r) => setOrder((r as { order: ActiveOrder | null }).order))
      .catch(() => setError("Failed to load delivery"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Start sending live location when rider has picked up the order
  useEffect(() => {
    if (!order || !["picked_up", "out_for_delivery"].includes(order.status)) return;
    if (!navigator.geolocation) return;

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setRiderLat(lat);
        setRiderLng(lng);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [order?.status, order?._id]);

  // Throttle location sends to backend every 5s
  useEffect(() => {
    if (!order || !["picked_up", "out_for_delivery"].includes(order.status) || !riderLat || !riderLng) return;
    if (locationTimer.current) clearTimeout(locationTimer.current);
    locationTimer.current = setTimeout(() => {
      riderApi.updateLocation(order._id, riderLat, riderLng).catch(() => {});
    }, 5000);
    return () => { if (locationTimer.current) clearTimeout(locationTimer.current); };
  }, [order, order?.status, order?._id, riderLat, riderLng]);

  async function updateStatus(newStatus: "picked_up" | "out_for_delivery" | "delivered") {
    if (!order) return;
    setUpdating(true);
    setError("");
    try {
      const res = await riderApi.updateStatus(order._id, newStatus);
      setOrder((res as { order: ActiveOrder }).order);
      if (newStatus === "delivered") {
        // Stop location tracking
        if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
        setOrder(null);
        window.location.href = "/rider/history";
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-[#ff6b35] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <Package className="w-7 h-7 text-gray-400" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">No Active Delivery</h2>
        <p className="text-sm text-gray-500 mt-2">Accept an order from Available Orders to start delivering</p>
        <a href="/rider/orders" className="inline-block mt-4 bg-[#ff6b35] text-white text-sm font-semibold px-6 py-3 rounded-full hover:bg-[#e55a26] transition-colors">
          Find Orders
        </a>
      </div>
    );
  }

  const restLat = order.restaurantLocation?.coordinates[1];
  const restLng = order.restaurantLocation?.coordinates[0];
  const step    = STATUS_STEP[order.status] ?? 0;

  const totalItems = order.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Active Delivery</h1>
        <p className="text-sm text-gray-500 mt-1">#{order._id.slice(-8).toUpperCase()}</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Status progress */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          {["At Restaurant", "Picked Up", "Out for Delivery", "Delivered"].map((label, i) => (
            <div key={label} className="flex flex-col items-center gap-1.5 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                i < step ? "bg-green-100 text-green-600" : i === step ? "bg-[#ff6b35] text-white" : "bg-gray-100 text-gray-400"
              }`}>
                {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <p className={`text-[10px] font-semibold text-center ${i <= step ? "text-gray-700" : "text-gray-400"}`}>{label}</p>
              {i < 2 && <div className={`absolute mt-4 h-0.5 w-20 ${i < step ? "bg-green-200" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>
        <p className="text-sm text-center text-gray-500 font-medium mt-1">{STATUS_LABEL[order.status]}</p>
      </div>

      {/* Live map */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-50 flex items-center gap-2">
          <Navigation className={`w-4 h-4 ${order.status === "out_for_delivery" && riderLat ? "text-[#ff6b35] animate-pulse" : "text-gray-400"}`} />
          <span className="text-sm font-semibold text-gray-900">
            {order.status === "out_for_delivery" && riderLat ? "Live location active" : "Delivery route"}
          </span>
        </div>
        <div className="h-64">
          <OrderTrackingMap
            restaurantLat={restLat}
            restaurantLng={restLng}
            restaurantName={order.restaurantName}
            restaurantImage={order.restaurantImage}
            riderLat={riderLat}
            riderLng={riderLng}
            deliveryAddress={`${order.address.street}, ${order.address.city}`}
            className="h-64 w-full"
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-1 gap-3">
        {order.status === "ready_for_pickup" && (
          <button
            onClick={() => updateStatus("picked_up")}
            disabled={updating}
            className="flex items-center justify-center gap-3 bg-[#ff6b35] hover:bg-[#e55a26] text-white font-bold text-base py-4 rounded-2xl transition-colors disabled:opacity-60 shadow-lg shadow-[#ff6b35]/25"
          >
            {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Package className="w-5 h-5" />}
            {updating ? "Updating…" : "Confirm Pickup"}
            {!updating && <ArrowRight className="w-5 h-5" />}
          </button>
        )}
        {order.status === "picked_up" && (
          <button
            onClick={() => updateStatus("out_for_delivery")}
            disabled={updating}
            className="flex items-center justify-center gap-3 bg-[#ff6b35] hover:bg-[#e55a26] text-white font-bold text-base py-4 rounded-2xl transition-colors disabled:opacity-60 shadow-lg shadow-[#ff6b35]/25"
          >
            {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
            {updating ? "Updating…" : "Start Delivery"}
            {!updating && <ArrowRight className="w-5 h-5" />}
          </button>
        )}
        {order.status === "out_for_delivery" && (
          <button
            onClick={() => updateStatus("delivered")}
            disabled={updating}
            className="flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white font-bold text-base py-4 rounded-2xl transition-colors disabled:opacity-60 shadow-lg shadow-green-600/25"
          >
            {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
            {updating ? "Updating…" : "Mark as Delivered"}
            {!updating && <ArrowRight className="w-5 h-5" />}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Restaurant */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide mb-2">Pickup from</p>
          <div className="flex items-center gap-2 mb-2">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-gray-100">
              {order.restaurantImage ? (
                <Image src={order.restaurantImage} alt={order.restaurantName} fill className="object-cover" sizes="32px" />
              ) : (
                <div className="w-full h-full bg-[#ff6b35] flex items-center justify-center text-white text-xs font-bold">
                  {order.restaurantName.charAt(0)}
                </div>
              )}
            </div>
            <p className="text-sm font-semibold text-gray-900 truncate">{order.restaurantName}</p>
          </div>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <MapPin className="w-3 h-3 shrink-0" /> {order.restaurantAddress || "See map"}
          </p>
        </div>

        {/* Customer */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-2">Deliver to</p>
          <p className="text-sm font-semibold text-gray-900">{order.address.label}</p>
          <p className="text-xs text-gray-500 mt-1 flex items-start gap-1">
            <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
            {order.address.street}, {order.address.city} {order.address.zip}
          </p>
        </div>
      </div>

      {/* Order items */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-gray-400" />
          <p className="text-sm font-bold text-gray-900">{totalItems} items to deliver</p>
        </div>
        <div className="space-y-2">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 text-sm">
              <span className="w-5 h-5 rounded-full bg-[#ff6b35] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                {item.quantity}
              </span>
              <span className="flex-1 text-gray-700">{item.name}</span>
              <span className="text-gray-500 text-xs">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        {order.notes && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500"><span className="font-semibold text-gray-700">Note:</span> {order.notes}</p>
          </div>
        )}
        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm font-bold text-gray-900">
          <span>Your delivery fee</span>
          <span className="text-green-600">+${(order.deliveryFee * 0.8).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
