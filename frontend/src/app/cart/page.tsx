"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, X, Tag, ChevronRight, UtensilsCrossed } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import QuantitySelector from "@/components/ui/QuantitySelector";
import EmptyState from "@/components/ui/EmptyState";
import { useCart } from "@/context/CartContext";
import { orderApi } from "@/lib/api";
import type { CartItem } from "@/types/cart";

const PROMO_LS_KEY = "ce_promo";

function itemLineTotal(item: CartItem): number {
  const addonsPrice = item.selectedAddons.reduce((s, a) => s + a.price, 0);
  return (item.price + addonsPrice) * item.quantity;
}

function groupByRestaurant(items: CartItem[]) {
  const map = new Map<string, { restaurantId: string; restaurantName: string; items: CartItem[] }>();
  for (const item of items) {
    if (!map.has(item.restaurantId)) {
      map.set(item.restaurantId, { restaurantId: item.restaurantId, restaurantName: item.restaurantName, items: [] });
    }
    map.get(item.restaurantId)!.items.push(item);
  }
  return Array.from(map.values());
}

function CartItemRow({
  item, onRemove, onIncrease, onDecrease,
}: {
  item: CartItem;
  onRemove: () => void;
  onIncrease: () => void;
  onDecrease: () => void;
}) {
  const lineTotal = itemLineTotal(item);
  return (
    <div className="flex gap-3 sm:gap-4 px-4 sm:px-5 py-4 border-b last:border-0 border-gray-50">
      <div className="relative rounded-xl overflow-hidden shrink-0 bg-gray-100" style={{ width: 72, height: 72 }}>
        <Image src={item.image} alt={item.name} fill className="object-cover" sizes="80px" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm leading-snug truncate">{item.name}</p>
        {item.selectedAddons.length > 0 && (
          <p className="text-xs text-gray-400 mt-0.5 leading-snug">
            + {item.selectedAddons.map((a) => a.name).join(", ")}
          </p>
        )}
        <p className="text-sm font-bold text-gray-900 mt-1.5">${lineTotal.toFixed(2)}</p>
      </div>
      <div className="flex flex-col items-end justify-between shrink-0">
        <button
          onClick={onRemove}
          className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors"
          aria-label="Remove item"
        >
          <X className="w-4 h-4" />
        </button>
        <QuantitySelector quantity={item.quantity} onIncrease={onIncrease} onDecrease={onDecrease} min={1} max={20} size="sm" />
      </div>
    </div>
  );
}

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();

  const [promoInput, setPromoInput]     = useState("");
  const [appliedCode, setAppliedCode]   = useState<string | null>(null);
  const [discount, setDiscount]         = useState(0);
  const [promoLabel, setPromoLabel]     = useState("");
  const [promoError, setPromoError]     = useState("");
  const [promoLoading, setPromoLoading] = useState(false);

  const groups = useMemo(() => groupByRestaurant(items), [items]);
  const deliveryFee = subtotal > 0 ? (subtotal >= 40 ? 0 : 2.99) : 0;
  const total = subtotal + deliveryFee - discount;

  async function handleApplyPromo() {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true);
    setPromoError("");
    try {
      const result = await orderApi.validateCoupon(code, subtotal);
      const { discount: d, coupon } = result as { valid: boolean; discount: number; coupon: { code: string; type: string; value: number } };
      setAppliedCode(code);
      setDiscount(d);
      const label = coupon.type === "percent" ? `${coupon.value}% off your order` : `$${coupon.value} off your order`;
      setPromoLabel(label);
      setPromoInput("");
      // Persist for checkout
      localStorage.setItem(PROMO_LS_KEY, JSON.stringify({ code, discount: d, label }));
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : "Invalid promo code.");
    } finally {
      setPromoLoading(false);
    }
  }

  function handleRemovePromo() {
    setAppliedCode(null);
    setDiscount(0);
    setPromoLabel("");
    setPromoError("");
    localStorage.removeItem(PROMO_LS_KEY);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">Your Cart</h1>

          {items.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart className="w-9 h-9" />}
              title="Your cart is empty"
              description="Looks like you haven't added anything yet. Browse restaurants to get started."
              action={
                <Link
                  href="/restaurants"
                  className="inline-flex items-center gap-2 bg-[#ff6b35] hover:bg-[#e55a26] text-white font-semibold px-6 py-3 rounded-full transition-colors text-sm"
                >
                  Browse Restaurants
                </Link>
              }
            />
          ) : (
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              {/* Left: item groups + promo */}
              <div className="flex-1 space-y-4 min-w-0">
                {groups.map((group) => (
                  <div key={group.restaurantId} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <UtensilsCrossed className="w-4 h-4 text-[#ff6b35] shrink-0" />
                        <span className="font-semibold text-gray-900 text-sm">{group.restaurantName}</span>
                      </div>
                      <Link href={`/restaurants/${group.restaurantId}`} className="text-xs text-[#ff6b35] hover:underline font-medium">
                        View menu
                      </Link>
                    </div>
                    {group.items.map((item) => (
                      <CartItemRow
                        key={item.cartItemId}
                        item={item}
                        onRemove={() => removeItem(item.cartItemId)}
                        onIncrease={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                        onDecrease={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                      />
                    ))}
                  </div>
                ))}

                {/* Promo code */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 sm:px-5 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4 text-[#ff6b35]" />
                    <h3 className="font-semibold text-gray-900 text-sm">Promo Code</h3>
                  </div>

                  {appliedCode ? (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                      <div>
                        <p className="text-sm font-semibold text-green-700">{appliedCode}</p>
                        <p className="text-xs text-green-600">{promoLabel} applied</p>
                      </div>
                      <button onClick={handleRemovePromo} className="text-green-400 hover:text-green-600 transition-colors" aria-label="Remove promo">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={promoInput}
                          onChange={(e) => { setPromoInput(e.target.value); setPromoError(""); }}
                          onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                          placeholder="Enter promo code (try WELCOME15)"
                          className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/30 focus:border-[#ff6b35] transition-colors"
                        />
                        <button
                          onClick={handleApplyPromo}
                          disabled={promoLoading || !promoInput.trim()}
                          className="bg-[#ff6b35] hover:bg-[#e55a26] disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors shrink-0"
                        >
                          {promoLoading ? "…" : "Apply"}
                        </button>
                      </div>
                      {promoError && <p className="text-xs text-red-500 mt-2">{promoError}</p>}
                    </>
                  )}
                </div>
              </div>

              {/* Right: order summary */}
              <div className="w-full lg:w-80 shrink-0 lg:sticky lg:top-24">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h2 className="font-bold text-gray-900 mb-4">Order Summary</h2>

                  <div className="space-y-2.5 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery fee</span>
                      {deliveryFee === 0 ? (
                        <span className="font-semibold text-green-600">Free</span>
                      ) : (
                        <span className="font-medium text-gray-900">${deliveryFee.toFixed(2)}</span>
                      )}
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount ({appliedCode})</span>
                        <span className="font-semibold">−${discount.toFixed(2)}</span>
                      </div>
                    )}
                    {subtotal < 40 && subtotal > 0 && (
                      <p className="text-xs text-gray-400 pt-1">
                        Add ${(40 - subtotal).toFixed(2)} more for free delivery
                      </p>
                    )}
                  </div>

                  <div className="border-t border-gray-100 mt-4 pt-4 flex justify-between items-center">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="text-xl font-extrabold text-gray-900">${total.toFixed(2)}</span>
                  </div>

                  <Link
                    href="/checkout"
                    className="mt-5 flex items-center justify-center gap-2 w-full bg-[#ff6b35] hover:bg-[#e55a26] text-white font-semibold text-sm py-3.5 rounded-full transition-colors"
                  >
                    Proceed to Checkout
                    <ChevronRight className="w-4 h-4" />
                  </Link>

                  <Link
                    href="/restaurants"
                    className="mt-3 block text-center text-sm text-gray-400 hover:text-[#ff6b35] transition-colors"
                  >
                    + Add more items
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
