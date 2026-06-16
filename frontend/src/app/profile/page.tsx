"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  User, Mail, Phone, MapPin, Plus, LogOut, Check,
  Home, Briefcase, Edit2, ClipboardList, Heart,
  CreditCard, Calendar, Save, Star, ChevronRight,
  Lock, Eye, EyeOff, ShieldCheck, Download,
} from "lucide-react";
import { checkPasswordRequirements } from "@/components/forms/SignupForm";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/context/AuthContext";
import { useFavourites } from "@/context/FavouritesContext";
import { authApi, orderApi, restaurantApi } from "@/lib/api";
import type { UserAddress } from "@/types/auth";
import type { Order, OrderStatus } from "@/types/order";
import type { Restaurant } from "@/types/restaurant";

// ─── Helpers ───────────────────────────────────────────────────────────────

type Tab = "info" | "orders" | "restaurants" | "payment" | "security";

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function resizeToDataUrl(file: File, maxSize = 200, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = url;
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptOrder(raw: any): Order {
  return {
    id:               String(raw._id ?? raw.id ?? ""),
    restaurantId:     String(raw.restaurantSlug ?? raw.restaurantId ?? ""),
    restaurantSlug:   raw.restaurantSlug ?? undefined,
    restaurantName:   String(raw.restaurantName ?? ""),
    restaurantImage:  String(raw.restaurantImage ?? ""),
    items: ((raw.items ?? []) as any[]).map((item) => ({
      menuItemId:    String(item.menuItemId ?? ""),
      name:          String(item.name ?? ""),
      image:         String(item.image ?? ""),
      price:         Number(item.price ?? 0),
      quantity:      Number(item.quantity ?? 1),
      selectedAddons: ((item.selectedAddons ?? []) as any[]).map((a, i: number) => ({
        id:    String(a._id ?? a.id ?? i),
        name:  String(a.name ?? ""),
        price: Number(a.price ?? 0),
      })),
    })),
    status:                raw.status ?? "placed",
    placedAt:              String(raw.placedAt ?? raw.createdAt ?? new Date().toISOString()),
    estimatedDeliveryMins: Number(raw.estimatedDeliveryMins ?? 35),
    address: {
      id:     String(raw.address?._id ?? raw.address?.id ?? "addr_api"),
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

const ADDR_ICONS: Record<string, React.ReactNode> = {
  Home:  <Home className="w-4 h-4" />,
  Work:  <Briefcase className="w-4 h-4" />,
  Other: <MapPin className="w-4 h-4" />,
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  placed:           "Placed",
  accepted:         "Accepted",
  rejected:         "Rejected",
  preparing:        "Preparing",
  ready_for_pickup: "Ready",
  picked_up:        "Picked Up",
  out_for_delivery: "On the way",
  delivered:        "Delivered",
  cancelled:        "Cancelled",
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  placed:           "bg-blue-100 text-blue-700",
  accepted:         "bg-teal-100 text-teal-700",
  rejected:         "bg-red-100 text-red-500",
  preparing:        "bg-amber-100 text-amber-700",
  ready_for_pickup: "bg-orange-100 text-orange-700",
  picked_up:        "bg-indigo-100 text-indigo-700",
  out_for_delivery: "bg-purple-100 text-purple-700",
  delivered:        "bg-green-100 text-green-700",
  cancelled:        "bg-red-100 text-red-500",
};

// ─── Sub-components ─────────────────────────────────────────────────────────

function SidebarItem({
  icon: Icon, label, active, onClick, danger,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left ${
        active
          ? "bg-[#ff6b35] text-white"
          : danger
          ? "text-gray-500 hover:bg-red-50 hover:text-red-500"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
    </button>
  );
}

function InfoField({
  label, type = "text", value, onChange, disabled,
}: {
  label: string; type?: string;
  value: string; onChange?: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          className="w-full px-3 pr-9 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/30 focus:border-[#ff6b35] transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
        />
        <Edit2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none" />
      </div>
    </div>
  );
}

function AddressCard({ address, removing, onRemove }: {
  address: UserAddress; removing: boolean; onRemove: () => void;
}) {
  return (
    <div className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-xl">
      <div className="w-9 h-9 rounded-xl bg-[#fff3ef] text-[#ff6b35] flex items-center justify-center shrink-0">
        {ADDR_ICONS[address.label] ?? <MapPin className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#ff6b35]">{address.label}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
          {address.street}<br />{address.city}{address.zip ? `, ${address.zip}` : ""}
        </p>
      </div>
      <button
        onClick={onRemove}
        disabled={removing}
        className="shrink-0 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40"
        aria-label="Remove address"
      >
        <Edit2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, isInitialised, logout, updateUser } = useAuth();
  const { favourites } = useFavourites();

  const [tab, setTab]             = useState<Tab>("info");
  const [fullName, setFullName]   = useState("");
  const [phone, setPhone]         = useState("");
  const [avatar, setAvatar]       = useState("");
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [saveError, setSaveError] = useState("");

  const [addresses, setAddresses]     = useState<UserAddress[]>([]);
  const [removingId, setRemovingId]   = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel]       = useState("Home");
  const [newStreet, setNewStreet]     = useState("");
  const [newCity, setNewCity]         = useState("");
  const [newZip, setNewZip]           = useState("");
  const [addingAddr, setAddingAddr]   = useState(false);
  const [addrError, setAddrError]     = useState("");

  const [orders, setOrders]           = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [restsLoading, setRestsLoading]     = useState(false);

  const [currentPwd, setCurrentPwd]   = useState("");
  const [newPwd, setNewPwd]           = useState("");
  const [confirmPwd, setConfirmPwd]   = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [pwdSaving, setPwdSaving]     = useState(false);
  const [pwdSuccess, setPwdSuccess]   = useState("");
  const [pwdError, setPwdError]       = useState("");

  // MFA enrollment state
  type MfaEnrollStep = "idle" | "qr" | "codes";
  const [mfaEnrollStep, setMfaEnrollStep]       = useState<MfaEnrollStep>("idle");
  const [mfaQrUrl, setMfaQrUrl]                 = useState("");
  const [mfaManualCode, setMfaManualCode]       = useState("");
  const [mfaVerifyCode, setMfaVerifyCode]       = useState("");
  const [mfaLoading, setMfaLoading]             = useState(false);
  const [mfaEnrollError, setMfaEnrollError]     = useState("");
  const [mfaRecoveryCodes, setMfaRecoveryCodes] = useState<string[]>([]);
  // MFA disable state
  const [showDisableForm, setShowDisableForm]   = useState(false);
  const [disablePwd, setDisablePwd]             = useState("");
  const [disableCode, setDisableCode]           = useState("");
  const [disableLoading, setDisableLoading]     = useState(false);
  const [disableError, setDisableError]         = useState("");

  const [exporting, setExporting]     = useState(false);
  const [exportDone, setExportDone]   = useState(false);
  const [exportError, setExportError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setPhone(user.phone ?? "");
      setAvatar(user.avatar ?? "");
      setAddresses(user.addresses ?? []);
    }
  }, [user]);

  useEffect(() => {
    if (tab !== "orders") return;
    setOrdersLoading(true);
    orderApi.list()
      .then(({ orders: list }) => setOrders((list as any[]).map(adaptOrder)))
      .catch(() => {})
      .finally(() => setOrdersLoading(false));
  }, [tab]);

  useEffect(() => {
    if (tab !== "restaurants") return;
    setRestsLoading(true);
    restaurantApi.list()
      .then(({ restaurants }) => setAllRestaurants(restaurants as Restaurant[]))
      .catch(() => {})
      .finally(() => setRestsLoading(false));
  }, [tab]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeToDataUrl(file, 200, 0.85);
    setAvatar(dataUrl);
  }

  async function handleSave() {
    setSaving(true); setSaveError("");
    try {
      const { user: updated } = await authApi.updateMe({ fullName, phone, avatar: avatar || undefined });
      updateUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddAddress() {
    if (!newStreet.trim()) return;
    setAddingAddr(true); setAddrError("");
    try {
      const { user: updated } = await authApi.addAddress({
        label: newLabel, street: newStreet.trim(), city: newCity.trim(), zip: newZip.trim(),
      });
      updateUser(updated);
      setAddresses(updated.addresses ?? []);
      setNewStreet(""); setNewCity(""); setNewZip(""); setShowAddForm(false);
    } catch (err) {
      setAddrError(err instanceof Error ? err.message : "Failed to add address.");
    } finally {
      setAddingAddr(false);
    }
  }

  async function handleChangePassword() {
    setPwdError(""); setPwdSuccess("");
    if (!currentPwd) return setPwdError("Enter your current password.");
    const reqs = checkPasswordRequirements(newPwd);
    if (!Object.values(reqs).every(Boolean)) return setPwdError("New password does not meet complexity requirements.");
    if (newPwd !== confirmPwd) return setPwdError("Passwords do not match.");
    setPwdSaving(true);
    try {
      const { message } = await authApi.changePassword(currentPwd, newPwd);
      setPwdSuccess(message ?? "Password changed successfully.");
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setPwdSaving(false);
    }
  }

  async function handleMfaEnroll() {
    setMfaLoading(true); setMfaEnrollError("");
    try {
      const { qrDataUrl, secret } = await authApi.mfaEnroll();
      setMfaQrUrl(qrDataUrl);
      setMfaManualCode(secret);
      setMfaEnrollStep("qr");
    } catch (err) {
      setMfaEnrollError(err instanceof Error ? err.message : "Failed to start MFA enrollment.");
    } finally {
      setMfaLoading(false);
    }
  }

  async function handleMfaVerifyEnroll() {
    if (!mfaVerifyCode.trim()) { setMfaEnrollError("Enter the 6-digit code from your app."); return; }
    setMfaLoading(true); setMfaEnrollError("");
    try {
      const { recoveryCodes } = await authApi.mfaVerifyEnroll(mfaVerifyCode.trim());
      setMfaRecoveryCodes(recoveryCodes);
      setMfaEnrollStep("codes");
      setMfaVerifyCode("");
      // Update the user object so the badge shows instantly
      if (user) updateUser({ ...user, mfaEnabled: true });
    } catch (err) {
      setMfaEnrollError(err instanceof Error ? err.message : "Verification failed.");
      setMfaVerifyCode("");
    } finally {
      setMfaLoading(false);
    }
  }

  async function handleMfaDisable() {
    if (!disablePwd || !disableCode) { setDisableError("Both fields are required."); return; }
    setDisableLoading(true); setDisableError("");
    try {
      await authApi.mfaDisable(disablePwd, disableCode);
      if (user) updateUser({ ...user, mfaEnabled: false });
      setShowDisableForm(false); setDisablePwd(""); setDisableCode("");
    } catch (err) {
      setDisableError(err instanceof Error ? err.message : "Failed to disable MFA.");
    } finally {
      setDisableLoading(false);
    }
  }

  async function handleExportData() {
    setExporting(true); setExportError(""); setExportDone(false);
    try {
      await authApi.exportMyData();
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  async function handleRemoveAddress(addrId: string) {
    setRemovingId(addrId);
    try {
      const { user: updated } = await authApi.removeAddress(addrId);
      updateUser(updated);
      setAddresses(updated.addresses ?? []);
    } catch { /* silently keep UI */ }
    finally { setRemovingId(null); }
  }

  if (isInitialised && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20 px-4 text-center">
          <p className="text-gray-500 text-sm">Sign in to view your profile.</p>
          <Link href="/login" className="bg-[#ff6b35] hover:bg-[#e55a26] text-white font-semibold px-6 py-3 rounded-full text-sm transition-colors">
            Login
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const memberSince = user
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "—";

  const inputCls = "w-full text-sm bg-white border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/30 focus:border-[#ff6b35] transition-colors";

  const favouriteRestaurants = allRestaurants.filter((r) => favourites.has(r.id));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">

          {/* ── Header card ──────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-5">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full bg-[#ff6b35] border-4 border-white shadow flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                {avatar ? (
                  <Image src={avatar} alt="Avatar" fill className="object-cover" unoptimized />
                ) : (
                  user ? getInitials(user.fullName) : "?"
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#ff6b35] flex items-center justify-center shadow"
                aria-label="Change avatar"
              >
                <Edit2 className="w-3 h-3 text-white" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900">{user?.fullName ?? "—"}</h1>
              <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                Member since {memberSince}
              </p>
            </div>

            <button
              onClick={() => setTab("info")}
              className="shrink-0 border border-[#ff6b35] text-[#ff6b35] hover:bg-[#fff3ef] text-sm font-semibold px-5 py-2 rounded-full transition-colors"
            >
              Edit Profile
            </button>
          </div>

          {/* ── Body: sidebar + content ───────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-5 items-start">

            {/* Sidebar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 space-y-1">
              <SidebarItem icon={User}          label="Personal Info"     active={tab === "info"}        onClick={() => setTab("info")} />
              <SidebarItem icon={ClipboardList} label="Order History"     active={tab === "orders"}      onClick={() => setTab("orders")} />
              <SidebarItem icon={Heart}         label="Saved Restaurants" active={tab === "restaurants"} onClick={() => setTab("restaurants")} />
              <SidebarItem icon={CreditCard}    label="Payment Methods"   active={tab === "payment"}     onClick={() => setTab("payment")} />
              <SidebarItem icon={ShieldCheck}   label="Security"          active={tab === "security"}    onClick={() => setTab("security")} />
              <div className="pt-1 border-t border-gray-100 mt-1">
                <SidebarItem icon={LogOut} label="Sign Out" onClick={logout} danger />
              </div>
            </div>

            {/* Main content */}
            <div className="space-y-5">

              {/* ── Personal Info ── */}
              {tab === "info" && (
                <>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-base font-bold text-gray-900 mb-5">Personal Information</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InfoField label="Full Name"     value={fullName}         onChange={setFullName} />
                      <InfoField label="Email Address" type="email" value={user?.email ?? ""} disabled />
                    </div>
                    <div className="mt-4">
                      <InfoField label="Phone Number" type="tel" value={phone} onChange={setPhone} />
                    </div>
                    {saveError && <p className="text-xs text-red-500 mt-3">{saveError}</p>}
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-base font-bold text-gray-900">Saved Addresses</h2>
                      <button
                        onClick={() => setShowAddForm((v) => !v)}
                        className="flex items-center gap-1.5 text-sm font-semibold text-[#ff6b35] hover:text-[#e55a26] transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Add New Address
                      </button>
                    </div>

                    {showAddForm && (
                      <div className="mb-4 bg-gray-50 rounded-xl p-4 space-y-3">
                        <div className="flex gap-2">
                          {["Home", "Work", "Other"].map((lbl) => (
                            <button key={lbl} type="button" onClick={() => setNewLabel(lbl)}
                              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                                newLabel === lbl ? "bg-[#ff6b35] border-[#ff6b35] text-white" : "border-gray-200 text-gray-600 hover:border-[#ff6b35] hover:text-[#ff6b35]"
                              }`}
                            >
                              {lbl}
                            </button>
                          ))}
                        </div>
                        <input placeholder="Street address" value={newStreet} onChange={(e) => setNewStreet(e.target.value)} className={inputCls} />
                        <div className="flex gap-2">
                          <input placeholder="City" value={newCity} onChange={(e) => setNewCity(e.target.value)} className={`${inputCls} flex-1`} />
                          <input placeholder="ZIP" value={newZip} onChange={(e) => setNewZip(e.target.value)} className={`${inputCls} w-24`} />
                        </div>
                        {addrError && <p className="text-xs text-red-500">{addrError}</p>}
                        <div className="flex gap-2">
                          <button
                            onClick={handleAddAddress}
                            disabled={addingAddr || !newStreet.trim()}
                            className="bg-[#ff6b35] hover:bg-[#e55a26] disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
                          >
                            {addingAddr ? "Saving…" : "Save Address"}
                          </button>
                          <button onClick={() => { setShowAddForm(false); setAddrError(""); }} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {addresses.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {addresses.map((addr) => (
                          <AddressCard
                            key={addr._id}
                            address={addr}
                            removing={removingId === addr._id}
                            onRemove={() => handleRemoveAddress(addr._id)}
                          />
                        ))}
                      </div>
                    ) : (
                      !showAddForm && (
                        <p className="text-sm text-gray-400 text-center py-6">No saved addresses yet.</p>
                      )
                    )}
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={saving || saved}
                    className={`w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                      saved ? "bg-green-500 text-white" : saving ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-[#ff6b35] hover:bg-[#e55a26] text-white"
                    }`}
                  >
                    {saved ? (
                      <><Check className="w-4 h-4" /> Saved!</>
                    ) : saving ? (
                      <><span className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" /> Saving…</>
                    ) : (
                      <><Save className="w-4 h-4" /> Save Changes</>
                    )}
                  </button>
                </>
              )}

              {/* ── Order History ── */}
              {tab === "orders" && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-base font-bold text-gray-900 mb-5">Order History</h2>

                  {ordersLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                      ))}
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-12">
                      <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-sm text-gray-400">No orders yet.</p>
                      <Link href="/restaurants" className="mt-3 inline-block text-sm font-semibold text-[#ff6b35] hover:text-[#e55a26] transition-colors">
                        Browse restaurants
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.map((order) => (
                        <Link
                          key={order.id}
                          href={`/orders/${order.id}`}
                          className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-[#ff6b35]/30 hover:bg-[#fff3ef]/30 transition-colors group"
                        >
                          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-gray-100 relative">
                            {order.restaurantImage && (
                              <Image src={order.restaurantImage} alt={order.restaurantName} fill className="object-cover" unoptimized />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{order.restaurantName}</p>
                            <p className="text-xs text-gray-400 mt-0.5 truncate">
                              {order.items.map((i) => i.name).join(", ")}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(order.placedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLOR[order.status]}`}>
                              {STATUS_LABEL[order.status]}
                            </span>
                            <p className="text-sm font-bold text-gray-900">${order.total.toFixed(2)}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#ff6b35] transition-colors shrink-0" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Saved Restaurants ── */}
              {tab === "restaurants" && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-base font-bold text-gray-900 mb-5">Saved Restaurants</h2>

                  {restsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                      ))}
                    </div>
                  ) : favouriteRestaurants.length === 0 ? (
                    <div className="text-center py-12">
                      <Heart className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-sm text-gray-400">No saved restaurants yet.</p>
                      <Link href="/restaurants" className="mt-3 inline-block text-sm font-semibold text-[#ff6b35] hover:text-[#e55a26] transition-colors">
                        Explore restaurants
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {favouriteRestaurants.map((r) => (
                        <Link
                          key={r.id}
                          href={`/restaurants/${r.id}`}
                          className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-[#ff6b35]/30 hover:bg-[#fff3ef]/30 transition-colors group"
                        >
                          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-gray-100 relative">
                            <Image src={r.image} alt={r.name} fill className="object-cover" unoptimized />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{r.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{r.cuisineTypes.join(" · ")}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span className="text-xs font-semibold text-gray-700">{r.rating.toFixed(1)}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#ff6b35] transition-colors shrink-0" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Payment Methods ── */}
              {tab === "payment" && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-base font-bold text-gray-900 mb-2">Payment Methods</h2>
                  <div className="text-center py-12">
                    <CreditCard className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">No payment methods saved yet.</p>
                  </div>
                </div>
              )}

              {/* ── Security ── */}
              {tab === "security" && (
                <>
                  {/* Change Password card */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <ShieldCheck className="w-5 h-5 text-[#ff6b35]" />
                      <h2 className="text-base font-bold text-gray-900">Change Password</h2>
                    </div>

                    {pwdSuccess && (
                      <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 mb-4">
                        <Check className="w-4 h-4 shrink-0" />
                        {pwdSuccess}
                      </div>
                    )}
                    {pwdError && (
                      <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
                        {pwdError}
                      </div>
                    )}

                    <div className="space-y-4 max-w-sm">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Current Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          <input
                            type={showCurrent ? "text" : "password"}
                            value={currentPwd}
                            onChange={(e) => setCurrentPwd(e.target.value)}
                            placeholder="Your current password"
                            className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/30 focus:border-[#ff6b35] transition-colors"
                          />
                          <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">New Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          <input
                            type={showNew ? "text" : "password"}
                            value={newPwd}
                            onChange={(e) => setNewPwd(e.target.value)}
                            placeholder="Min. 12 chars, upper, lower, digit, symbol"
                            className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/30 focus:border-[#ff6b35] transition-colors"
                          />
                          <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {newPwd && (() => {
                          const r = checkPasswordRequirements(newPwd);
                          return (
                            <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                              {([
                                ["minLength", "12+ characters"],
                                ["hasUpper",  "Uppercase letter"],
                                ["hasLower",  "Lowercase letter"],
                                ["hasDigit",  "Number"],
                                ["hasSymbol", "Special character"],
                              ] as [keyof typeof r, string][]).map(([key, lbl]) => (
                                <li key={key} className={`flex items-center gap-1 text-xs font-medium ${r[key] ? "text-green-600" : "text-gray-400"}`}>
                                  <span className={`inline-flex w-3.5 h-3.5 rounded-full items-center justify-center text-[9px] font-bold shrink-0 ${r[key] ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"}`}>
                                    {r[key] ? "✓" : "·"}
                                  </span>
                                  {lbl}
                                </li>
                              ))}
                            </ul>
                          );
                        })()}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Confirm New Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          <input
                            type={showConfirmPwd ? "text" : "password"}
                            value={confirmPwd}
                            onChange={(e) => setConfirmPwd(e.target.value)}
                            placeholder="Re-enter new password"
                            className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/30 focus:border-[#ff6b35] transition-colors"
                          />
                          <button type="button" onClick={() => setShowConfirmPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={handleChangePassword}
                        disabled={pwdSaving}
                        className="w-full py-3 bg-[#ff6b35] hover:bg-[#e55a26] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-full text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        {pwdSaving ? (
                          <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Updating…</>
                        ) : (
                          <><ShieldCheck className="w-4 h-4" /> Update Password</>
                        )}
                      </button>
                    </div>

                    <div className="mt-6 pt-5 border-t border-gray-100">
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Password requirements: minimum 12 characters, at least one uppercase letter,
                        one lowercase letter, one digit, and one special character.
                        Your last 5 passwords cannot be reused.
                      </p>
                    </div>
                  </div>

                  {/* Data Export card */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-1">
                      <Download className="w-5 h-5 text-[#ff6b35]" />
                      <h2 className="text-base font-bold text-gray-900">Export My Data</h2>
                    </div>
                    <p className="text-xs text-gray-400 mb-5">
                      Download a copy of your personal data including your profile and order history.
                      The file will be saved as a JSON file.
                    </p>

                    {exportError && (
                      <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
                        {exportError}
                      </div>
                    )}

                    <button
                      onClick={handleExportData}
                      disabled={exporting || exportDone}
                      className={`inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full transition-colors ${
                        exportDone
                          ? "bg-green-500 text-white"
                          : exporting
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-[#ff6b35] hover:bg-[#e55a26] text-white"
                      }`}
                    >
                      {exportDone ? (
                        <><Check className="w-4 h-4" /> Downloaded!</>
                      ) : exporting ? (
                        <><span className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" /> Preparing…</>
                      ) : (
                        <><Download className="w-4 h-4" /> Download My Data</>
                      )}
                    </button>
                  </div>

                  {/* Two-Factor Authentication card */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className={`w-5 h-5 ${user?.mfaEnabled ? "text-green-500" : "text-gray-400"}`} />
                        <h2 className="text-base font-bold text-gray-900">Two-Factor Authentication</h2>
                      </div>
                      {user?.mfaEnabled && (
                        <span className="text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">Active</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mb-5">
                      {user?.mfaEnabled
                        ? "Your account is protected with a time-based one-time password (TOTP) authenticator app."
                        : "Add an extra layer of security with Google Authenticator, Authy, or any TOTP app."}
                    </p>

                    {/* ── Not enabled: enrollment flow ── */}
                    {!user?.mfaEnabled && (
                      <>
                        {mfaEnrollError && (
                          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
                            {mfaEnrollError}
                          </div>
                        )}

                        {mfaEnrollStep === "idle" && (
                          <button
                            onClick={handleMfaEnroll}
                            disabled={mfaLoading}
                            className="inline-flex items-center gap-2 text-sm font-semibold bg-[#ff6b35] hover:bg-[#e55a26] disabled:opacity-60 text-white px-5 py-2.5 rounded-full transition-colors"
                          >
                            {mfaLoading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                            Set up 2FA
                          </button>
                        )}

                        {mfaEnrollStep === "qr" && (
                          <div className="space-y-4 max-w-sm">
                            <p className="text-sm text-gray-600">
                              Scan the QR code with your authenticator app, then enter the 6-digit code to confirm.
                            </p>
                            {mfaQrUrl && (
                              <div className="flex justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={mfaQrUrl} alt="MFA QR Code" className="w-48 h-48 rounded-xl border border-gray-200" />
                              </div>
                            )}
                            <div className="bg-gray-50 rounded-xl px-4 py-3">
                              <p className="text-xs text-gray-500 mb-1 font-medium">Manual entry code:</p>
                              <p className="text-xs font-mono text-gray-700 break-all select-all">{mfaManualCode}</p>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1.5">6-digit code from your app</label>
                              <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={mfaVerifyCode}
                                onChange={(e) => setMfaVerifyCode(e.target.value.replace(/\D/g, ""))}
                                placeholder="000000"
                                className="w-full px-4 py-2.5 text-center tracking-widest text-lg font-mono bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/30 focus:border-[#ff6b35] transition-colors"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={handleMfaVerifyEnroll}
                                disabled={mfaLoading || mfaVerifyCode.length !== 6}
                                className="flex-1 py-2.5 bg-[#ff6b35] hover:bg-[#e55a26] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-full text-sm transition-colors flex items-center justify-center gap-2"
                              >
                                {mfaLoading
                                  ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Verifying…</>
                                  : "Verify & Enable"}
                              </button>
                              <button
                                type="button"
                                onClick={() => { setMfaEnrollStep("idle"); setMfaQrUrl(""); setMfaManualCode(""); setMfaVerifyCode(""); setMfaEnrollError(""); }}
                                className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-full transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {mfaEnrollStep === "codes" && (
                          <div className="space-y-4 max-w-sm">
                            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
                              <Check className="w-4 h-4 shrink-0" />
                              Two-factor authentication enabled successfully!
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                              <p className="text-sm font-semibold text-amber-800 mb-1">Save your recovery codes</p>
                              <p className="text-xs text-amber-700 mb-3">
                                Store these somewhere safe. Each code can only be used once to access your account if you lose your authenticator.
                              </p>
                              <div className="grid grid-cols-2 gap-1.5">
                                {mfaRecoveryCodes.map((code) => (
                                  <span key={code} className="font-mono text-xs bg-white border border-amber-200 text-amber-900 px-2 py-1 rounded-lg text-center select-all">
                                    {code}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <button
                              onClick={() => { setMfaEnrollStep("idle"); setMfaRecoveryCodes([]); }}
                              className="w-full py-2.5 border border-gray-200 text-gray-600 hover:border-[#ff6b35] hover:text-[#ff6b35] font-semibold rounded-full text-sm transition-colors"
                            >
                              Done
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {/* ── Enabled: disable flow ── */}
                    {user?.mfaEnabled && (
                      <>
                        {!showDisableForm ? (
                          <button
                            onClick={() => setShowDisableForm(true)}
                            className="inline-flex items-center gap-2 text-sm font-semibold text-red-500 hover:text-red-600 border border-red-200 hover:border-red-400 px-5 py-2.5 rounded-full transition-colors"
                          >
                            Disable 2FA
                          </button>
                        ) : (
                          <div className="space-y-3 max-w-sm">
                            <p className="text-sm text-gray-600">Enter your password and current authenticator code to disable 2FA.</p>
                            {disableError && (
                              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                                {disableError}
                              </div>
                            )}
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                              <input
                                type="password"
                                value={disablePwd}
                                onChange={(e) => setDisablePwd(e.target.value)}
                                placeholder="Your password"
                                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/30 focus:border-[#ff6b35] transition-colors"
                              />
                            </div>
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              value={disableCode}
                              onChange={(e) => setDisableCode(e.target.value)}
                              placeholder="6-digit code or recovery code"
                              className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/30 focus:border-[#ff6b35] transition-colors font-mono"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={handleMfaDisable}
                                disabled={disableLoading}
                                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-semibold rounded-full text-sm transition-colors flex items-center justify-center gap-2"
                              >
                                {disableLoading
                                  ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                  : "Confirm Disable"}
                              </button>
                              <button
                                type="button"
                                onClick={() => { setShowDisableForm(false); setDisablePwd(""); setDisableCode(""); setDisableError(""); }}
                                className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-full transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}

            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
