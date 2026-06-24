"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ClipboardList, ChevronRight, RotateCcw } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import OrderStatusBadge from "@/components/ui/OrderStatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import { orderApi } from "@/lib/api";
import { useCart } from "@/context/CartContext";
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

function getDateGroup(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffDays = Math.floor(
    (now.setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "Earlier this week";
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function groupOrders(orders: Order[]): { label: string; orders: Order[] }[] {
  const map = new Map<string, Order[]>();
  for (const order of orders) {
    const label = getDateGroup(order.placedAt);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(order);
  }
  return Array.from(map.entries()).map(([label, orders]) => ({ label, orders }));
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function OrderRow({ order, onReorder }: { order: Order; onReorder: () => void }) {
  const itemSummary = order.items
    .map((i) => (i.quantity > 1 ? `${i.name} ×${i.quantity}` : i.name))
    .join(", ");

  return (
    <Link
      href={`/orders/${order.id}`}
      className="flex items-center gap-4 p-4 sm:px-5 hover:bg-gray-50 transition-colors group"
    >
      <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-gray-100">
        {order.restaurantImage ? (
          <Image src={order.restaurantImage} alt={order.restaurantName} fill className="object-cover" sizes="56px" />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">No img</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-semibold text-gray-900 text-sm truncate">{order.restaurantName}</p>
          <OrderStatusBadge status={order.status} size="sm" />
        </div>
        <p className="text-xs text-gray-400 truncate mb-1">{itemSummary}</p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-semibold text-gray-800">${order.total.toFixed(2)}</span>
          <span>·</span>
          <span>{formatTime(order.placedAt)}</span>
          <span>·</span>
          <span>{order.items.reduce((s, i) => s + i.quantity, 0)} items</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {order.status === "delivered" && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onReorder(); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#ff6b35] bg-[#fff3ef] hover:bg-[#ffe6dc] px-3 py-1.5 rounded-full transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reorder
          </button>
        )}
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors" />
      </div>
    </Link>
  );
}

export default function OrdersPage() {
  const { addItem } = useCart();
  const [orders, setOrders]       = useState<Order[]>([]);
  const [loading, setLoading]     = useState(true);
  const [reorderedId, setReorderedId] = useState<string | null>(null);

  useEffect(() => {
    orderApi.list()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ orders: raw }) => setOrders((raw as any[]).map(adaptOrder)))
      .catch(() => { /* show empty state */ })
      .finally(() => setLoading(false));
  }, []);

  function handleReorder(order: Order) {
    for (const item of order.items) {
      addItem({
        menuItemId:     item.menuItemId,
        restaurantId:   order.restaurantId,
        restaurantName: order.restaurantName,
        name:           item.name,
        price:          item.price,
        image:          item.image,
        quantity:       item.quantity,
        selectedAddons: item.selectedAddons,
      });
    }
    setReorderedId(order.id);
    setTimeout(() => setReorderedId(null), 2500);
  }

  const groups = groupOrders(orders);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">My Orders</h1>

          {reorderedId && (
            <div className="mb-4 flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 text-sm font-medium px-4 py-3 rounded-xl">
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>Items added to your cart.</span>
              <Link href="/cart" className="ml-auto underline text-green-700 hover:text-green-800 shrink-0">View Cart →</Link>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 rounded-full border-2 border-[#ff6b35] border-t-transparent animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="w-9 h-9" />}
              title="No orders yet"
              description="Your order history will appear here once you place your first order."
              action={
                <Link href="/restaurants" className="inline-flex items-center gap-2 bg-[#ff6b35] hover:bg-[#e55a26] text-white font-semibold px-6 py-3 rounded-full transition-colors text-sm">
                  Order Now
                </Link>
              }
            />
          ) : (
            <div className="space-y-6">
              {groups.map(({ label, orders: groupOrders }) => (
                <div key={label}>
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">{label}</h2>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
                    {groupOrders.map((order) => (
                      <OrderRow key={order.id} order={order} onReorder={() => handleReorder(order)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
