"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, ShoppingBag, Bike, History, DollarSign,
  LogOut, Package, MapPin, Banknote, X, CheckCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { riderApi, getToken } from "@/lib/api";

const NAV = [
  { href: "/rider",            icon: LayoutDashboard, label: "Dashboard" },
  { href: "/rider/orders",     icon: ShoppingBag,     label: "Requests"  },
  { href: "/rider/deliveries", icon: Bike,            label: "Active"    },
  { href: "/rider/history",    icon: History,         label: "History"   },
  { href: "/rider/earnings",   icon: DollarSign,      label: "Earnings"  },
];

interface DeliveryRequest {
  orderId:           string;
  restaurantName:    string;
  restaurantAddress: string;
  deliveryAddress:   string;
  earning:           number;
  deliveryFee:       number;
  itemSummary:       string;
  total:             number;
}

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  const { user, isInitialised, logout } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();

  const [isOnline, setIsOnline]           = useState(false);
  const [toggling, setToggling]           = useState(false);
  const [request, setRequest]             = useState<DeliveryRequest | null>(null);
  const [accepting, setAccepting]         = useState(false);
  const [acceptError, setAcceptError]     = useState("");

  const esRef            = useRef<EventSource | null>(null);
  const reconnectTimer   = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isInitialised) return;
    if (!user) { router.push("/login"); return; }
    if (user.role !== "rider") { router.push("/"); return; }
    setIsOnline(user.isOnline ?? false);
  }, [user, isInitialised, router]);

  // SSE connection to receive delivery requests
  const connect = useCallback(() => {
    const token = getToken();
    if (!token) return;
    const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
    const url  = `${BASE}/rider/sse?token=${encodeURIComponent(token)}`;

    esRef.current?.close();
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const event = JSON.parse(e.data as string) as any;
        if (event.type === "delivery_request") {
          setRequest({
            orderId:           event.orderId,
            restaurantName:    event.restaurantName,
            restaurantAddress: event.restaurantAddress,
            deliveryAddress:   event.deliveryAddress,
            earning:           event.earning,
            deliveryFee:       event.deliveryFee,
            itemSummary:       event.itemSummary,
            total:             event.total,
          });
          setAcceptError("");
        }
        if (event.type === "delivery_request_taken") {
          setRequest((prev) => (prev?.orderId === event.orderId ? null : prev));
        }
      } catch { /* ignore malformed */ }
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
      reconnectTimer.current = setTimeout(connect, 5000);
    };
  }, []);

  useEffect(() => {
    if (!isInitialised || !user || user.role !== "rider") return;
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [isInitialised, user, connect]);

  async function toggleOnline() {
    setToggling(true);
    try {
      const { isOnline: newState } = await riderApi.setAvailability(!isOnline);
      setIsOnline(newState);
    } catch { /* keep current state */ }
    finally { setToggling(false); }
  }

  async function handleAccept() {
    if (!request) return;
    setAccepting(true);
    setAcceptError("");
    try {
      await riderApi.acceptOrder(request.orderId);
      setRequest(null);
      router.push("/rider/deliveries");
    } catch (e) {
      setAcceptError((e as Error).message ?? "Already taken by another rider");
      setRequest(null);
    } finally {
      setAccepting(false);
    }
  }

  if (!isInitialised || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#ff6b35] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-white border-r border-gray-100 flex flex-col min-h-screen sticky top-0">
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#ff6b35] flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-none">CraveExpress</p>
              <p className="text-[10px] text-[#ff6b35] font-semibold leading-none mt-0.5">RIDER</p>
            </div>
          </div>
        </div>

        {/* Online / Offline toggle */}
        <div className="px-4 py-3 border-b border-gray-100">
          <button
            onClick={toggleOnline}
            disabled={toggling}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              isOnline
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-gray-100 text-gray-500 border border-gray-200"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
              {isOnline ? "Online" : "Offline"}
            </span>
            <span className="text-xs font-normal opacity-60">{toggling ? "…" : "tap to switch"}</span>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ href, icon: Icon, label }) => {
            const exact  = href === "/rider";
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-[#fff3ef] text-[#ff6b35]"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User + logout */}
        <div className="px-3 pb-4 border-t border-gray-100 pt-3">
          <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-[#ff6b35] flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{user.fullName}</p>
              <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 p-6">{children}</main>

      {/* ── Delivery request popup ─────────────────────────────────────── */}
      {request && (
        <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)]">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-[#ff6b35] px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-white rounded-full animate-ping" />
                <p className="text-white font-bold text-sm">New Delivery Request!</p>
              </div>
              <button onClick={() => setRequest(null)} className="text-white/70 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Pickup */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pickup from</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{request.restaurantName}</p>
                  <p className="text-xs text-gray-400 truncate">{request.restaurantAddress || "Restaurant"}</p>
                </div>
              </div>

              {/* Deliver */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Deliver to</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{request.deliveryAddress}</p>
                </div>
              </div>

              {/* Items */}
              <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2 line-clamp-2">{request.itemSummary}</p>

              {/* Earnings */}
              <div className="flex items-center justify-between bg-green-50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 text-green-700">
                  <Banknote className="w-4 h-4" />
                  <span className="text-xs font-semibold">Your Earnings</span>
                </div>
                <span className="text-lg font-extrabold text-green-700">+${request.earning.toFixed(2)}</span>
              </div>

              {acceptError && (
                <p className="text-xs text-red-500 text-center">{acceptError}</p>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setRequest(null)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:border-gray-300 transition-colors"
                >
                  Pass
                </button>
                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="flex-1 py-2.5 bg-[#ff6b35] hover:bg-[#e55a26] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {accepting ? (
                    <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Accepting…</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" /> Accept</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
