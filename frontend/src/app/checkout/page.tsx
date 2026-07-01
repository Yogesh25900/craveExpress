"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin, CreditCard, Banknote, Wallet, ChevronRight, Plus, Check,
  Home, Briefcase, AlertCircle, FileText, Navigation, Loader2,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { orderApi, restaurantApi, authApi, paymentApi, submitEsewaForm } from "@/lib/api";
import type { CartItem } from "@/types/cart";
import type { OrderAddress } from "@/types/order";
import type { UserAddress, User } from "@/types/auth";

const PROMO_LS_KEY = "ce_promo";
const SERVICE_FEE  = 1.50;

function itemLineTotal(item: CartItem): number {
  return (item.price + item.selectedAddons.reduce((s, a) => s + a.price, 0)) * item.quantity;
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

function userAddrToOrderAddr(a: UserAddress): OrderAddress {
  return { id: a._id, label: a.label, street: a.street, city: a.city, zip: a.zip };
}

const ADDR_ICON: Record<string, React.ReactNode> = {
  Home: <Home className="w-4 h-4" />,
  Work: <Briefcase className="w-4 h-4" />,
};

// ── Nominatim reverse-geocode ─────────────────────────────────────────────────
interface GeoFill { street: string; city: string; zip: string }

async function reverseGeocode(lat: number, lng: number): Promise<GeoFill> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    { headers: { "Accept-Language": "en" } }
  );
  const data = await res.json() as {
    display_name?: string;
    address?: {
      house_number?: string; road?: string;
      city?: string; town?: string; village?: string; county?: string;
      postcode?: string;
    };
  };

  const a = data.address ?? {};
  const streetParts = [a.house_number, a.road].filter(Boolean);
  return {
    street: streetParts.join(" ") || data.display_name?.split(",")[0] || "",
    city:   a.city ?? a.town ?? a.village ?? a.county ?? "",
    zip:    a.postcode ?? "",
  };
}

// ── Address form ──────────────────────────────────────────────────────────────
interface NewAddrResult { label: string; street: string; city: string; zip: string }

function NewAddressForm({ onAdd, onCancel }: {
  onAdd: (addr: NewAddrResult) => Promise<void>;
  onCancel: () => void;
}) {
  const [street, setStreet]       = useState("");
  const [refPoint, setRefPoint]   = useState("");
  const [city, setCity]           = useState("");
  const [zip, setZip]             = useState("");
  const [locating, setLocating]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  async function handleUseLocation() {
    if (!navigator.geolocation) { setError("Geolocation not supported by your browser."); return; }
    setLocating(true);
    setError("");
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000 })
      );
      const fill = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      setStreet(fill.street);
      setCity(fill.city);
      setZip(fill.zip);
    } catch {
      setError("Could not get your location. Please type the address manually.");
    } finally {
      setLocating(false);
    }
  }

  async function handleSubmit() {
    if (!street.trim()) { setError("Address is required."); return; }
    setSaving(true);
    setError("");
    try {
      await onAdd({ label: refPoint.trim() || "Home", street: street.trim(), city: city.trim(), zip: zip.trim() });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save address.");
      setSaving(false);
    }
  }

  const field = "w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/30 focus:border-[#ff6b35] transition-colors";

  return (
    <div className="mt-3 bg-gray-50 rounded-xl p-4 space-y-3">
      {/* Use my location */}
      <button
        type="button"
        onClick={handleUseLocation}
        disabled={locating}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-blue-300 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
      >
        {locating
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Detecting location…</>
          : <><Navigation className="w-4 h-4" /> Use my current location</>
        }
      </button>

      {/* Address */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Address *</label>
        <input
          type="text"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          placeholder="123 Main Street, Brooklyn, NY 11201"
          className={field}
        />
      </div>

      {/* Reference point */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Reference point</label>
        <input
          type="text"
          value={refPoint}
          onChange={(e) => setRefPoint(e.target.value)}
          placeholder="e.g. Near the blue gate, 2nd floor, apt 4…"
          className={field}
        />
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-500">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-2 bg-[#ff6b35] hover:bg-[#e55a26] text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors disabled:opacity-60"
        >
          {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : "Save Address"}
        </button>
        <button type="button" onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors px-4 py-2">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart }  = useCart();
  const { user, isInitialised, updateUser } = useAuth();

  const [addresses, setAddresses]                 = useState<OrderAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [showAddressChange, setShowAddressChange] = useState(false);
  const [showAddressForm, setShowAddressForm]     = useState(false);
  const [paymentMethod, setPaymentMethod]         = useState<"cod" | "card" | "esewa">("cod");
  const [orderNotes, setOrderNotes]               = useState("");
  const [placingOrder, setPlacingOrder]           = useState(false);
  const [orderError, setOrderError]               = useState("");
  const [restaurantBanner, setRestaurantBanner]   = useState("");

  const appliedPromo = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(PROMO_LS_KEY);
      return raw ? (JSON.parse(raw) as { code: string; discount: number; label: string }) : null;
    } catch { return null; }
  }, []);

  useEffect(() => {
    if (!isInitialised) return;
    if (!user) { router.push("/login?redirect=/checkout"); return; }
    const saved = (user.addresses ?? []).map(userAddrToOrderAddr);
    setAddresses(saved);
    if (saved.length > 0) setSelectedAddressId(saved[0].id);
  }, [user, isInitialised, router]);

  const groups         = useMemo(() => groupByRestaurant(items), [items]);
  const restaurantName = groups[0]?.restaurantName ?? "";

  useEffect(() => {
    const rid = groups[0]?.restaurantId;
    if (!rid) return;
    restaurantApi.get(rid)
      .then(({ restaurant }) => {
        const r = restaurant as { banner?: string };
        if (r.banner) setRestaurantBanner(r.banner);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups[0]?.restaurantId]);

  const deliveryFee    = subtotal >= 40 ? 0 : 2.99;
  const discount       = appliedPromo?.discount ?? 0;
  const total          = subtotal + deliveryFee + SERVICE_FEE - discount;
  const selectedAddr   = addresses.find((a) => a.id === selectedAddressId) ?? addresses[0];
  const totalItemCount = items.reduce((s, i) => s + i.quantity, 0);

  // Save address to DB and update context + local state
  async function handleAddNewAddress(data: { label: string; street: string; city: string; zip: string }) {
    const { user: updatedUser } = await authApi.addAddress(data);
    updateUser(updatedUser as User);
    const updatedAddrs = ((updatedUser as User).addresses ?? []).map(userAddrToOrderAddr);
    setAddresses(updatedAddrs);
    setSelectedAddressId(updatedAddrs[updatedAddrs.length - 1].id);
    setShowAddressForm(false);
    setShowAddressChange(false);
  }

  async function handlePlaceOrder() {
    if (items.length === 0 || !selectedAddr) return;
    if (!user) { router.push("/login?redirect=/checkout"); return; }

    setPlacingOrder(true);
    setOrderError("");
    try {
      const firstGroup = groups[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { order } = (await orderApi.place({
        restaurantId: firstGroup.restaurantId,
        items: items.map((item) => ({
          menuItemId:     item.menuItemId,
          name:           item.name,
          image:          item.image,
          price:          item.price,
          quantity:       item.quantity,
          selectedAddons: item.selectedAddons.map((a) => ({ name: a.name, price: a.price })),
        })),
        address: { label: selectedAddr.label, street: selectedAddr.street, city: selectedAddr.city, zip: selectedAddr.zip },
        paymentMethod,
        subtotal,
        deliveryFee,
        discount,
        promoCode: appliedPromo?.code,
        total,
        notes: orderNotes.trim() || undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      })) as { order: any };

      localStorage.removeItem(PROMO_LS_KEY);
      clearCart();

      // eSewa: hand off to the hosted payment page. The order is created in a
      // "pending" payment state; the server flips it to "paid" on eSewa's verified
      // callback, which then redirects to /order-confirmed.
      if (paymentMethod === "esewa") {
        const { action, fields } = await paymentApi.initiateEsewa(order._id);
        submitEsewaForm(action, fields);
        return; // browser navigates away to eSewa
      }

      router.push(`/order-confirmed?orderId=${order._id}`);
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : "Failed to place order. Please try again.");
      setPlacingOrder(false);
    }
  }

  if (!isInitialised) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#ff6b35] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (items.length === 0 && !placingOrder) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20 px-4 text-center">
          <p className="text-gray-500 text-sm">Your cart is empty.</p>
          <Link href="/restaurants"
            className="bg-[#ff6b35] hover:bg-[#e55a26] text-white font-semibold px-6 py-3 rounded-full text-sm transition-colors">
            Browse Restaurants
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
            {restaurantName && (
              <p className="text-sm text-gray-500 mt-1">Complete your order with {restaurantName}</p>
            )}
          </div>

          <div className="flex flex-col lg:flex-row gap-6 items-start">

            {/* ── Left column ──────────────────────────────── */}
            <div className="flex-1 space-y-4 min-w-0">

              {/* Delivery Address */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#ff6b35]" />
                    <h2 className="text-base font-bold text-gray-900">Delivery Address</h2>
                  </div>
                  {!showAddressForm && (
                    <button
                      type="button"
                      onClick={() => { setShowAddressChange((v) => !v); setShowAddressForm(false); }}
                      className="text-sm font-semibold text-[#ff6b35] hover:text-[#e55a26] transition-colors"
                    >
                      {showAddressChange ? "Done" : selectedAddr ? "Change" : "Add"}
                    </button>
                  )}
                </div>

                {/* Selected address display */}
                {selectedAddr && !showAddressChange && (
                  <div className="flex items-start gap-3 p-4 bg-[#fff3ef] rounded-xl border border-[#ff6b35]/20">
                    <div className="w-10 h-10 rounded-xl bg-[#ff6b35] flex items-center justify-center shrink-0 text-white">
                      {ADDR_ICON[selectedAddr.label] ?? <MapPin className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{user?.fullName}</p>
                      <p className="text-sm text-gray-600">{selectedAddr.street}</p>
                      {(selectedAddr.city || selectedAddr.zip) && (
                        <p className="text-xs text-gray-500">{[selectedAddr.city, selectedAddr.zip].filter(Boolean).join(" ")}</p>
                      )}
                      {selectedAddr.label && !["Home","Work","Other"].includes(selectedAddr.label) && (
                        <p className="text-xs text-gray-400 italic mt-0.5">&ldquo;{selectedAddr.label}&rdquo;</p>
                      )}
                    </div>
                  </div>
                )}

                {/* No address yet */}
                {!selectedAddr && !showAddressChange && (
                  <div className="py-2">
                    <p className="text-sm text-gray-400">No saved addresses. Click <strong>Add</strong> to add one.</p>
                  </div>
                )}

                {/* Address list (change panel) */}
                {showAddressChange && (
                  <div className="space-y-2.5">
                    {addresses.map((addr) => (
                      <button key={addr.id} type="button"
                        onClick={() => { setSelectedAddressId(addr.id); setShowAddressChange(false); }}
                        className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                          selectedAddressId === addr.id
                            ? "border-[#ff6b35] bg-[#fff3ef]"
                            : "border-gray-100 bg-gray-50 hover:border-gray-200"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          selectedAddressId === addr.id ? "bg-[#ff6b35] text-white" : "bg-gray-200 text-gray-500"
                        }`}>
                          {ADDR_ICON[addr.label] ?? <MapPin className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{addr.street}</p>
                          {(addr.city || addr.zip) && (
                            <p className="text-xs text-gray-500">{[addr.city, addr.zip].filter(Boolean).join(" ")}</p>
                          )}
                          {addr.label && !["Home","Work","Other"].includes(addr.label) && (
                            <p className="text-xs text-gray-400 italic">&ldquo;{addr.label}&rdquo;</p>
                          )}
                        </div>
                        {selectedAddressId === addr.id && <Check className="w-4 h-4 text-[#ff6b35] shrink-0 mt-0.5" />}
                      </button>
                    ))}

                    {!showAddressForm ? (
                      <button type="button" onClick={() => setShowAddressForm(true)}
                        className="w-full flex items-center gap-2 p-4 rounded-xl border border-dashed border-gray-200 text-sm text-gray-500 hover:border-[#ff6b35] hover:text-[#ff6b35] transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Add a new address
                      </button>
                    ) : (
                      <NewAddressForm
                        onAdd={handleAddNewAddress}
                        onCancel={() => setShowAddressForm(false)}
                      />
                    )}
                  </div>
                )}

                {/* Show form inline when no addresses at all */}
                {!showAddressChange && !selectedAddr && showAddressForm && (
                  <NewAddressForm
                    onAdd={handleAddNewAddress}
                    onCancel={() => setShowAddressForm(false)}
                  />
                )}

                {!showAddressChange && !selectedAddr && !showAddressForm && (
                  <button type="button" onClick={() => setShowAddressForm(true)}
                    className="mt-3 w-full flex items-center gap-2 p-4 rounded-xl border border-dashed border-gray-200 text-sm text-gray-500 hover:border-[#ff6b35] hover:text-[#ff6b35] transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add a new address
                  </button>
                )}
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="w-4 h-4 text-[#ff6b35]" />
                  <h2 className="text-base font-bold text-gray-900">Payment Method</h2>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* Cash on Delivery */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cod")}
                    className={`relative p-4 rounded-2xl text-left transition-all ${
                      paymentMethod === "cod" ? "ring-2 ring-[#ff6b35]" : "ring-1 ring-gray-200 hover:ring-gray-300"
                    }`}
                    style={{
                      background: paymentMethod === "cod"
                        ? "linear-gradient(135deg,#ff6b35 0%,#e55a26 100%)"
                        : "linear-gradient(135deg,#f3f4f6 0%,#e5e7eb 100%)",
                    }}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${paymentMethod === "cod" ? "bg-white/20" : "bg-white"}`}>
                      <Banknote className={`w-4 h-4 ${paymentMethod === "cod" ? "text-white" : "text-gray-500"}`} />
                    </div>
                    <p className={`text-sm font-bold leading-tight ${paymentMethod === "cod" ? "text-white" : "text-gray-700"}`}>
                      Cash on Delivery
                    </p>
                    <p className={`text-[11px] mt-0.5 ${paymentMethod === "cod" ? "text-white/75" : "text-gray-400"}`}>
                      Pay when delivered
                    </p>
                    {/* Checkmark indicator */}
                    <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === "cod" ? "border-white bg-white/20" : "border-gray-300 bg-white"
                    }`}>
                      {paymentMethod === "cod" && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                  </button>

                  {/* Credit / Debit Card */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`relative p-4 rounded-2xl text-left transition-all ${
                      paymentMethod === "card" ? "ring-2 ring-[#1e3a8a]" : "ring-1 ring-gray-200 hover:ring-gray-300"
                    }`}
                    style={{
                      background: paymentMethod === "card"
                        ? "linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%)"
                        : "linear-gradient(135deg,#f3f4f6 0%,#e5e7eb 100%)",
                    }}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${paymentMethod === "card" ? "bg-white/20" : "bg-white"}`}>
                      <CreditCard className={`w-4 h-4 ${paymentMethod === "card" ? "text-white" : "text-gray-500"}`} />
                    </div>
                    <p className={`text-sm font-bold leading-tight ${paymentMethod === "card" ? "text-white" : "text-gray-700"}`}>
                      Credit / Debit Card
                    </p>
                    <p className={`text-[11px] mt-0.5 ${paymentMethod === "card" ? "text-white/75" : "text-gray-400"}`}>
                      Secure online payment
                    </p>
                    {/* Checkmark indicator */}
                    <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === "card" ? "border-white bg-white/20" : "border-gray-300 bg-white"
                    }`}>
                      {paymentMethod === "card" && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                  </button>

                  {/* eSewa — digital wallet (Nepal) */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("esewa")}
                    className={`relative p-4 rounded-2xl text-left transition-all ${
                      paymentMethod === "esewa" ? "ring-2 ring-[#60bb46]" : "ring-1 ring-gray-200 hover:ring-gray-300"
                    }`}
                    style={{
                      background: paymentMethod === "esewa"
                        ? "linear-gradient(135deg,#60bb46 0%,#3f9f2f 100%)"
                        : "linear-gradient(135deg,#f3f4f6 0%,#e5e7eb 100%)",
                    }}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${paymentMethod === "esewa" ? "bg-white/20" : "bg-white"}`}>
                      <Wallet className={`w-4 h-4 ${paymentMethod === "esewa" ? "text-white" : "text-gray-500"}`} />
                    </div>
                    <p className={`text-sm font-bold leading-tight ${paymentMethod === "esewa" ? "text-white" : "text-gray-700"}`}>
                      eSewa
                    </p>
                    <p className={`text-[11px] mt-0.5 ${paymentMethod === "esewa" ? "text-white/75" : "text-gray-400"}`}>
                      Pay via eSewa wallet
                    </p>
                    <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === "esewa" ? "border-white bg-white/20" : "border-gray-300 bg-white"
                    }`}>
                      {paymentMethod === "esewa" && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                  </button>
                </div>

                {paymentMethod === "esewa" && (
                  <div className="mt-4 bg-green-50 rounded-xl p-4">
                    <p className="text-xs text-green-700 flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5" />
                      You&apos;ll be redirected to eSewa to complete payment securely, then returned to your order confirmation.
                    </p>
                  </div>
                )}

                {paymentMethod === "card" && (
                  <div className="mt-4 bg-gray-50 rounded-xl p-4 space-y-3">
                    <input type="text" placeholder="1234 5678 9012 3456" maxLength={19}
                      className="w-full text-sm bg-white border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/30 focus:border-[#ff6b35] transition-colors" />
                    <div className="flex gap-2">
                      <input type="text" placeholder="MM / YY" maxLength={7}
                        className="flex-1 text-sm bg-white border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/30 focus:border-[#ff6b35] transition-colors" />
                      <input type="text" placeholder="CVV" maxLength={4}
                        className="w-24 text-sm bg-white border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/30 focus:border-[#ff6b35] transition-colors" />
                    </div>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5" /> Stripe integration coming soon
                    </p>
                  </div>
                )}
              </div>

              {/* Order Notes */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-[#ff6b35]" />
                  <h2 className="text-base font-bold text-gray-900">Add Order Notes</h2>
                </div>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. No onions please, extra napkins..."
                  className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/30 focus:border-[#ff6b35] transition-colors resize-none"
                />
              </div>
            </div>

            {/* ── Right: Order Summary ─────────────────────── */}
            <div className="w-full lg:w-80 shrink-0 lg:sticky lg:top-24 rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white">
              {/* Restaurant banner */}
              <div className="relative h-32 w-full bg-gray-300">
                {restaurantBanner ? (
                  <Image src={restaurantBanner} alt={restaurantName} fill className="object-cover" sizes="320px" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <p className="absolute bottom-3 left-4 text-white font-bold text-base drop-shadow">{restaurantName}</p>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900">Order Summary</h2>
                  <span className="text-xs font-semibold bg-[#ff6b35] text-white px-2.5 py-1 rounded-full">
                    {totalItemCount} {totalItemCount === 1 ? "Item" : "Items"}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  {items.map((item) => (
                    <div key={item.cartItemId} className="flex gap-3 items-start">
                      <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                        <Image src={item.image} alt={item.name} fill className="object-cover" sizes="44px" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">
                          {item.quantity}x {item.name}
                        </p>
                        {item.selectedAddons.length > 0 && (
                          <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                            {item.selectedAddons.map((a) => a.name).join(", ")}
                          </p>
                        )}
                      </div>
                      <p className="text-xs font-bold text-gray-900 shrink-0">${itemLineTotal(item).toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 pt-3 space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    {deliveryFee === 0
                      ? <span className="font-semibold text-green-600">Free</span>
                      : <span className="font-medium text-[#ff6b35]">${deliveryFee.toFixed(2)}</span>
                    }
                  </div>
                  <div className="flex justify-between">
                    <span>Service Fee</span>
                    <span className="font-medium text-gray-900">${SERVICE_FEE.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({appliedPromo?.code})</span>
                      <span className="font-semibold">−${discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
                    <span>Total</span>
                    <span className="text-[#ff6b35]">${total.toFixed(2)}</span>
                  </div>
                </div>

                {orderError && (
                  <p className="mt-3 text-xs text-red-500 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />{orderError}
                  </p>
                )}

                <button
                  onClick={handlePlaceOrder}
                  disabled={placingOrder || items.length === 0 || !selectedAddr}
                  className={`mt-5 w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base transition-all ${
                    placingOrder || !selectedAddr
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-[#ff6b35] hover:bg-[#e55a26] text-white shadow-lg shadow-[#ff6b35]/25"
                  }`}
                >
                  {placingOrder ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Placing Order…</>
                  ) : (
                    <>Place Order <ChevronRight className="w-5 h-5" /></>
                  )}
                </button>

                <p className="text-[11px] text-gray-400 text-center mt-3 leading-relaxed">
                  By placing your order, you agree to CraveExpress&apos;s{" "}
                  <Link href="#" className="underline hover:text-gray-600">Terms of Service</Link>.
                </p>
              </div>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
