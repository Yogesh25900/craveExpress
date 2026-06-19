"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShoppingCart, Flame } from "lucide-react";
import QuantitySelector from "@/components/ui/QuantitySelector";
import { useCart } from "@/context/CartContext";
import { restaurantApi } from "@/lib/api";
import type { MenuItem, Restaurant } from "@/types/restaurant";

export default function FoodItemPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>;
}) {
  const { id: restaurantId, itemId } = use(params);
  const router = useRouter();
  const { addItem } = useCart();

  const [item, setItem]           = useState<MenuItem | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading]     = useState(true);

  const [quantity, setQuantity]             = useState(1);
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set());
  const [added, setAdded]                   = useState(false);

  useEffect(() => {
    Promise.all([
      restaurantApi.get(restaurantId).then(({ restaurant: r }) => setRestaurant(r as Restaurant)),
      restaurantApi.menu(restaurantId).then(({ items }) => {
        const found = (items as MenuItem[]).find((i) => i.id === itemId);
        setItem(found ?? null);
      }),
    ])
      .catch(() => { /* item stays null → "not found" UI */ })
      .finally(() => setLoading(false));
  }, [restaurantId, itemId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#ff6b35] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!item || !restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500 text-sm">Item not found.</p>
        <button
          onClick={() => router.push(`/restaurants/${restaurantId}`)}
          className="text-[#ff6b35] text-sm font-semibold hover:underline"
        >
          ← Back to menu
        </button>
      </div>
    );
  }

  const selectedAddons = item.addons.filter((a) => selectedAddonIds.has(a.id));
  const addonsTotal    = selectedAddons.reduce((s, a) => s + a.price, 0);
  const unitPrice      = item.price + addonsTotal;
  const total          = unitPrice * quantity;

  function toggleAddon(id: string) {
    setSelectedAddonIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleAddToCart() {
    addItem({
      menuItemId:     item!.id,
      restaurantId:   restaurant!.id,
      restaurantName: restaurant!.name,
      name:           item!.name,
      price:          item!.price,
      image:          item!.image,
      quantity,
      selectedAddons,
    });
    setAdded(true);
    setTimeout(() => router.push(`/restaurants/${restaurantId}`), 800);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Hero image */}
      <div className="relative h-64 sm:h-80 w-full bg-gray-200 shrink-0">
        <Image src={item.image} alt={item.name} fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-800" />
        </button>

        <button
          onClick={() => router.push("/cart")}
          className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
        >
          <ShoppingCart className="w-5 h-5 text-gray-800" />
        </button>
      </div>

      {/* Content card */}
      <div className="flex-1 bg-white rounded-t-3xl -mt-6 relative z-10 px-5 sm:px-8 pt-6 pb-32 max-w-2xl mx-auto w-full">

        <div className="flex items-center gap-2 mb-3">
          {item.isPopular && (
            <span className="flex items-center gap-1 text-xs font-bold text-[#ff6b35] bg-[#fff3ef] px-2.5 py-1 rounded-full">
              <Flame className="w-3 h-3" /> Popular
            </span>
          )}
          {item.isVeg && (
            <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
              🌿 Veg
            </span>
          )}
        </div>

        <h1 className="text-xl font-bold text-gray-900">{item.name}</h1>
        <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{item.description}</p>

        <div className="flex items-center justify-between mt-4 py-4 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Base price</p>
            <p className="text-2xl font-extrabold text-gray-900">${item.price.toFixed(2)}</p>
          </div>
          <QuantitySelector
            quantity={quantity}
            onIncrease={() => setQuantity((q) => Math.min(q + 1, 20))}
            onDecrease={() => setQuantity((q) => Math.max(q - 1, 1))}
            size="lg"
          />
        </div>

        {item.addons.length > 0 && (
          <div className="mt-2">
            <h2 className="text-base font-bold text-gray-900 mb-3">Customise</h2>
            <div className="space-y-2">
              {item.addons.map((addon) => {
                const checked = selectedAddonIds.has(addon.id);
                return (
                  <label
                    key={addon.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                      checked ? "border-[#ff6b35] bg-[#fff3ef]" : "border-gray-100 bg-gray-50 hover:border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        checked ? "border-[#ff6b35] bg-[#ff6b35]" : "border-gray-300 bg-white"
                      }`}>
                        {checked && (
                          <svg viewBox="0 0 12 10" className="w-3 h-3 text-white fill-none stroke-current stroke-2">
                            <polyline points="1 5 4.5 8.5 11 1" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-800">{addon.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-[#ff6b35]">+${addon.price.toFixed(2)}</span>
                    <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleAddon(addon.id)} />
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-6">
          From <span className="font-medium text-gray-600">{restaurant.name}</span>
        </p>
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 py-3 sm:px-8">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400">Total</p>
            <p className="text-lg font-extrabold text-gray-900">${total.toFixed(2)}</p>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={added}
            className={`flex items-center gap-2.5 px-8 py-3.5 rounded-full font-semibold text-sm transition-all ${
              added ? "bg-green-500 text-white cursor-default" : "bg-[#ff6b35] hover:bg-[#e55a26] text-white"
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            {added ? "Added!" : `Add to Cart · ${quantity > 1 ? `×${quantity}` : ""} $${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
