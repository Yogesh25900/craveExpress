"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, ShoppingBag, UtensilsCrossed, Tag,
  BarChart3, Store, LogOut, Power, Bell, Menu, X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ownerApi } from "@/lib/api";
import { useOwnerSSE, type OwnerSseEvent } from "@/hooks/useOwnerSSE";

const NAV = [
  { href: "/owner",            label: "Dashboard",  Icon: LayoutDashboard },
  { href: "/owner/orders",     label: "Orders",     Icon: ShoppingBag     },
  { href: "/owner/menu",       label: "Menu",       Icon: UtensilsCrossed },
  { href: "/owner/categories", label: "Categories", Icon: Tag             },
  { href: "/owner/analytics",  label: "Analytics",  Icon: BarChart3       },
  { href: "/owner/profile",    label: "Profile",    Icon: Store           },
];

interface Toast { id: number; message: string }

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const [restaurantName, setRestaurantName] = useState("Your Restaurant");
  const [isOpen, setIsOpen]       = useState(false);
  const [newCount, setNewCount]   = useState(0);
  const [drawerOpen, setDrawer]   = useState(false);
  const [toasts, setToasts]       = useState<Toast[]>([]);

  useEffect(() => {
    ownerApi.getRestaurant()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ restaurant: r }) => {
        const rest = r as { name: string; isOpen: boolean };
        setRestaurantName(rest.name);
        setIsOpen(rest.isOpen);
      })
      .catch(() => {});

    ownerApi.getOrders({ status: "placed" })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ orders }) => setNewCount((orders as any[]).length))
      .catch(() => {});
  }, []);

  const addToast = useCallback((message: string) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6_000);
  }, []);

  const handleSseEvent = useCallback((event: OwnerSseEvent) => {
    if (event.type === "new_order") {
      setNewCount((c) => c + 1);
      addToast(`🛎 New order from ${event.customerName} — $${event.total.toFixed(2)}`);
    }
  }, [addToast]);

  useOwnerSSE(handleSseEvent);

  async function toggleOpen() {
    const next = !isOpen;
    setIsOpen(next);
    try {
      await ownerApi.updateRestaurant({ isOpen: next });
    } catch {
      setIsOpen(!next); // rollback
    }
  }

  // When owner views orders, pending count resets on tab focus
  useEffect(() => {
    if (pathname.startsWith("/owner/orders")) {
      // Re-fetch to get accurate count after visiting orders page
      ownerApi.getOrders({ status: "placed" })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then(({ orders }) => setNewCount((orders as any[]).length))
        .catch(() => {});
    }
  }, [pathname]);

  const active = (href: string) =>
    href === "/owner" ? pathname === "/owner" : pathname.startsWith(href);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen bg-gray-50 flex" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Mobile overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setDrawer(false)} />
      )}

      {/* ── Toast stack ──────────────────────────────────────────── */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg max-w-xs pointer-events-auto animate-in slide-in-from-right-4"
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 flex flex-col z-30 transition-transform duration-200
          ${drawerOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        style={{ backgroundColor: "#0f2419" }}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-lg leading-tight tracking-tight">CraveExpress</p>
            <p className="text-green-400 text-xs font-semibold mt-0.5 uppercase tracking-wider">Partner Portal</p>
          </div>
          <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setDrawer(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, Icon }) => {
            const on = active(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setDrawer(false)}
                className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-colors
                  ${on
                    ? "bg-white/10 text-green-300 border-l-[3px] border-green-400 pl-[9px] pr-3 py-2.5"
                    : "text-gray-400 hover:text-white hover:bg-white/5 px-3 py-2.5"
                  }`}
              >
                <Icon size={17} className="shrink-0" />
                <span className="flex-1">{label}</span>
                {label === "Orders" && newCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-tight">
                    {newCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-4 py-4 border-t border-white/10 space-y-3">
          <button
            onClick={toggleOpen}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors
              ${isOpen ? "bg-green-600/20 text-green-300" : "bg-red-800/20 text-red-300"}`}
          >
            <span className="flex items-center gap-2">
              <Power size={13} />
              {isOpen ? "Restaurant Open" : "Restaurant Closed"}
            </span>
            <span className={`relative w-8 h-4 rounded-full transition-colors ${isOpen ? "bg-green-500" : "bg-gray-600"}`}>
              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${isOpen ? "translate-x-4" : "translate-x-0.5"}`} />
            </span>
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-green-800 flex items-center justify-center text-green-200 text-xs font-bold shrink-0">
              {(user?.fullName ?? "O").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.fullName ?? "Restaurant Owner"}</p>
              <p className="text-gray-500 text-[10px] truncate">Owner · {restaurantName}</p>
            </div>
            <button onClick={logout} className="text-gray-500 hover:text-red-400 transition-colors shrink-0" title="Logout">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────── */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-3 sticky top-0 z-10">
          <button className="lg:hidden text-gray-500 hover:text-gray-700 p-1" onClick={() => setDrawer(true)}>
            <Menu size={20} />
          </button>

          <div className="flex-1 min-w-0 hidden sm:block">
            <p className="text-sm text-gray-500">
              {greeting()},{" "}
              <span className="font-semibold text-gray-800">{restaurantName}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
              ${isOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? "bg-green-500" : "bg-gray-400"}`} />
              {isOpen ? "Open" : "Closed"}
            </div>

            <button className="relative text-gray-400 hover:text-gray-700 transition-colors">
              <Bell size={18} />
              {newCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                  {newCount > 9 ? "9+" : newCount}
                </span>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>

    </div>
  );
}
