"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, MapPin, Phone, Store, CreditCard, Clock, Banknote,
  Bike, Search, UserCheck, X, Loader2, CheckCircle,
} from "lucide-react";
import { adminApi } from "@/lib/api";

type OrderStatus = "placed" | "preparing" | "out_for_delivery" | "delivered" | "cancelled";

interface OrderItem { name: string; quantity: number; price: number }
interface AdminOrder {
  _id: string;
  userId: { fullName: string; email: string; phone: string } | null;
  restaurantName: string;
  restaurantSlug?: string;
  items: OrderItem[];
  total: number;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  status: OrderStatus;
  paymentMethod: string;
  address: { label: string; street: string; city: string; zip: string };
  createdAt: string;
  // Rider fields
  riderId?: string | { _id: string };
  riderName?: string;
  riderPhone?: string;
  assignedAt?: string;
}

interface Rider {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  activeDeliveries: number;
  totalDeliveries: number;
}

const STATUS_FLOW: OrderStatus[] = ["placed","preparing","out_for_delivery","delivered"];
const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Order Placed", preparing: "Preparing", out_for_delivery: "Out for Delivery", delivered: "Delivered", cancelled: "Cancelled",
};
const STATUS_STYLE: Record<OrderStatus, string> = {
  placed: "bg-red-100 text-red-700", preparing: "bg-blue-100 text-blue-700",
  out_for_delivery: "bg-purple-100 text-purple-700", delivered: "bg-green-100 text-green-700", cancelled: "bg-gray-100 text-gray-500",
};
const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  placed: "preparing", preparing: "out_for_delivery", out_for_delivery: "delivered",
};
const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  placed: "Accept → Preparing", preparing: "Dispatch → En Route", out_for_delivery: "Complete → Delivered",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });
}

function isCash(method: string) { return method === "cod" || method === "cash"; }
function orderNum(id: string) { return id.slice(-6).toUpperCase(); }
function riderId(r: AdminOrder["riderId"]) {
  if (!r) return undefined;
  if (typeof r === "string") return r;
  return r._id;
}

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder]         = useState<AdminOrder | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [advancing, setAdv]       = useState(false);

  // Rider assignment state
  const [riders, setRiders]                 = useState<Rider[]>([]);
  const [riderSearch, setRiderSearch]       = useState("");
  const [loadingRiders, setLoadingRiders]   = useState(false);
  const [assigning, setAssigning]           = useState(false);
  const [unassigning, setUnassigning]       = useState(false);
  const [showRiderPanel, setShowRiderPanel] = useState(false);
  const [assignError, setAssignError]       = useState("");

  useEffect(() => {
    adminApi.getOrder(id)
      .then((res) => setOrder(res.order as AdminOrder))
      .catch(() => setError("Order not found"))
      .finally(() => setLoading(false));
  }, [id]);

  async function advance() {
    if (!order) return;
    const next = NEXT[order.status];
    if (!next) return;
    setAdv(true);
    try {
      const res = await adminApi.updateOrderStatus(id, next);
      setOrder(res.order as AdminOrder);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setAdv(false);
    }
  }

  async function loadRiders() {
    setLoadingRiders(true);
    try {
      const res = await adminApi.riders(riderSearch || undefined);
      setRiders((res as { riders: Rider[] }).riders);
    } catch { /* ignore */ }
    finally { setLoadingRiders(false); }
  }

  async function assignRider(rId: string) {
    setAssigning(true);
    setAssignError("");
    try {
      const res = await adminApi.assignRider(id, rId);
      setOrder(res.order as AdminOrder);
      setShowRiderPanel(false);
    } catch (e) {
      setAssignError((e as Error).message);
    } finally {
      setAssigning(false);
    }
  }

  async function unassignRider() {
    setUnassigning(true);
    setAssignError("");
    try {
      const res = await adminApi.unassignRider(id);
      setOrder(res.order as AdminOrder);
    } catch (e) {
      setAssignError((e as Error).message);
    } finally {
      setUnassigning(false);
    }
  }

  // Open rider panel + fetch
  function openRiderPanel() {
    setShowRiderPanel(true);
    loadRiders();
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
    </div>
  );

  if (error || !order) return (
    <div className="max-w-xl py-16 text-center">
      <p className="text-gray-400 text-sm">{error || "Order not found."}</p>
      <Link href="/admin/orders" className="text-orange-500 text-sm hover:underline mt-2 block">← Back to Orders</Link>
    </div>
  );

  const currentStep = STATUS_FLOW.indexOf(order.status);
  const isCancelled = order.status === "cancelled";
  const isDelivered = order.status === "delivered";
  const customer    = order.userId;
  const currentRiderId = riderId(order.riderId);
  const hasRider    = !!(order.riderName ?? currentRiderId);
  const canAssign   = !isCancelled && !isDelivered && order.status !== "out_for_delivery";

  const filteredRiders = riderSearch
    ? riders.filter((r) =>
        r.fullName.toLowerCase().includes(riderSearch.toLowerCase()) ||
        r.email.toLowerCase().includes(riderSearch.toLowerCase())
      )
    : riders;

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/orders" className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-gray-900">Order #{orderNum(order._id)}</h1>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[order.status]}`}>{STATUS_LABEL[order.status]}</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><Clock size={11} />{fmt(order.createdAt)}</p>
        </div>
      </div>

      {!isCancelled && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Timeline</h2>
          <ol className="space-y-0">
            {STATUS_FLOW.map((s, i) => {
              const done   = i < currentStep || (isDelivered && i === currentStep);
              const active = i === currentStep && !isDelivered;
              return (
                <li key={s} className="flex items-start gap-3 pb-5 last:pb-0 relative">
                  {i < STATUS_FLOW.length - 1 && (
                    <span className={`absolute left-[9px] top-5 w-0.5 h-full ${done ? "bg-orange-400" : "bg-gray-200"}`} />
                  )}
                  <span className={`relative z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5
                    ${done ? "bg-orange-500 border-orange-500" : active ? "bg-white border-orange-500 shadow-[0_0_0_4px_rgba(249,115,22,0.15)]" : "bg-white border-gray-300"}`}>
                    {done && <span className="w-2 h-2 rounded-full bg-white" />}
                    {active && <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />}
                  </span>
                  <div className="pt-0.5">
                    <p className={`text-sm font-medium ${active ? "text-orange-600" : done ? "text-gray-700" : "text-gray-400"}`}>{STATUS_LABEL[s]}</p>
                    {(done || active) && <p className="text-xs text-gray-400">{active ? "In progress" : fmt(order.createdAt)}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-2.5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</h2>
          {customer ? (
            <>
              <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold">
                  {customer.fullName.charAt(0)}
                </div>
                {customer.fullName}
              </div>
              {customer.phone && (
                <div className="flex items-start gap-2 text-sm text-gray-500">
                  <Phone size={13} className="mt-0.5 shrink-0" />
                  <span className="text-xs">{customer.phone}</span>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-400">Unknown customer</p>
          )}
          {order.address && (
            <div className="flex items-start gap-2 text-sm text-gray-500">
              <MapPin size={13} className="mt-0.5 shrink-0" />
              <span className="text-xs">{order.address.street}, {order.address.city} {order.address.zip}</span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-2.5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Restaurant</h2>
          <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
            <Store size={14} className="text-gray-400" /> {order.restaurantName}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {isCash(order.paymentMethod) ? <Banknote size={13} className="text-gray-400" /> : <CreditCard size={13} className="text-gray-400" />}
            <span className="text-xs">{isCash(order.paymentMethod) ? "Cash on Delivery" : "Paid by Card"}</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 pt-1">${order.total.toFixed(2)}</div>
        </div>
      </div>

      {/* ── Rider Assignment ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bike size={16} className="text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900">Delivery Partner</h2>
          </div>
          {canAssign && !showRiderPanel && (
            <button onClick={openRiderPanel}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
            >
              {hasRider ? "Reassign" : "Assign Rider"}
            </button>
          )}
        </div>

        {assignError && (
          <p className="text-xs text-red-500 mb-3">{assignError}</p>
        )}

        {/* Current assigned rider */}
        {hasRider && !showRiderPanel ? (
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <UserCheck size={18} className="text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{order.riderName}</p>
              {order.riderPhone && (
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <Phone size={10} /> {order.riderPhone}
                </p>
              )}
              {order.assignedAt && (
                <p className="text-xs text-gray-400 mt-0.5">Assigned {fmt(order.assignedAt)}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-500" />
              {canAssign && (
                <button onClick={unassignRider} disabled={unassigning}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Unassign rider"
                >
                  {unassigning ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                </button>
              )}
            </div>
          </div>
        ) : !showRiderPanel ? (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl text-gray-400">
            <Bike size={18} />
            <p className="text-sm">{isCancelled ? "Order cancelled — no rider needed" : isDelivered ? "Delivered" : "No rider assigned yet"}</p>
          </div>
        ) : null}

        {/* Rider selector panel */}
        {showRiderPanel && canAssign && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 p-3 border-b border-gray-100">
              <Search size={14} className="text-gray-400 shrink-0" />
              <input
                type="text"
                value={riderSearch}
                onChange={(e) => setRiderSearch(e.target.value)}
                placeholder="Search riders by name or email…"
                className="flex-1 text-sm bg-transparent focus:outline-none"
                onKeyDown={(e) => e.key === "Enter" && loadRiders()}
              />
              <button onClick={() => setShowRiderPanel(false)} className="text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            </div>

            {loadingRiders ? (
              <div className="flex justify-center py-6">
                <Loader2 size={18} className="animate-spin text-gray-400" />
              </div>
            ) : filteredRiders.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No riders found</p>
            ) : (
              <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                {filteredRiders.map((rider) => {
                  const isCurrentRider = currentRiderId === rider._id;
                  return (
                    <div key={rider._id} className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-[#ff6b35] flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {rider.fullName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{rider.fullName}</p>
                        <p className="text-xs text-gray-400 truncate">{rider.email}</p>
                        <p className="text-xs text-gray-400">
                          {rider.activeDeliveries > 0
                            ? <span className="text-orange-500">{rider.activeDeliveries} active</span>
                            : <span className="text-green-600">Available</span>
                          } · {rider.totalDeliveries} total
                        </p>
                      </div>
                      <button
                        onClick={() => assignRider(rider._id)}
                        disabled={assigning || isCurrentRider}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                          isCurrentRider
                            ? "bg-green-100 text-green-600 cursor-default"
                            : "bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-60"
                        }`}
                      >
                        {assigning ? <Loader2 size={12} className="animate-spin" /> : isCurrentRider ? "Assigned" : "Assign"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-900">Items</h2></div>
        <div className="divide-y divide-gray-100">
          {order.items.map((item, i) => (
            <div key={i} className="px-5 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-700">
                {item.quantity > 1 && <span className="text-gray-400 mr-1">{item.quantity}×</span>}
                {item.name}
              </span>
              <span className="text-sm font-medium text-gray-700">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 bg-gray-50 space-y-1">
          {(order.deliveryFee ?? 0) > 0 && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>Delivery fee</span><span>${order.deliveryFee.toFixed(2)}</span>
            </div>
          )}
          {(order.discount ?? 0) > 0 && (
            <div className="flex justify-between text-xs text-green-600">
              <span>Discount</span><span>−${order.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-200">
            <span>Total</span><span>${order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {!isCancelled && !isDelivered && NEXT[order.status] && (
        <button onClick={advance} disabled={advancing}
          className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-60">
          {advancing ? "Updating…" : NEXT_LABEL[order.status]}
        </button>
      )}
    </div>
  );
}
