"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Users, Store, Tag, ShoppingBag,
  CreditCard, Ticket, BarChart3, Settings, LogOut, Menu, X, Shield,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { href: "/admin",              label: "Dashboard",   Icon: LayoutDashboard },
  { href: "/admin/users",        label: "Users",        Icon: Users           },
  { href: "/admin/restaurants",  label: "Restaurants",  Icon: Store           },
  { href: "/admin/categories",   label: "Categories",   Icon: Tag             },
  { href: "/admin/orders",       label: "Orders",       Icon: ShoppingBag     },
  { href: "/admin/transactions", label: "Transactions", Icon: CreditCard      },
  { href: "/admin/coupons",      label: "Coupons",      Icon: Ticket          },
  { href: "/admin/analytics",    label: "Analytics",    Icon: BarChart3       },
  { href: "/admin/settings",     label: "Settings",     Icon: Settings        },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname        = usePathname();
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawer] = useState(false);

  const active = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-gray-50 flex" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Mobile overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setDrawer(false)} />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 flex flex-col z-30 transition-transform duration-200
          ${drawerOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        style={{ backgroundColor: "#1e1e2e" }}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-lg leading-tight tracking-tight">CraveExpress</p>
            <p className="text-[#ff6b35] text-xs font-semibold mt-0.5 uppercase tracking-wider flex items-center gap-1">
              <Shield size={10} /> Admin Console
            </p>
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
                    ? "bg-white/10 text-orange-300 border-l-[3px] border-orange-400 pl-[9px] pr-3 py-2.5"
                    : "text-gray-400 hover:text-white hover:bg-white/5 px-3 py-2.5"
                  }`}
              >
                <Icon size={17} className="shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User row */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-orange-700/60 flex items-center justify-center text-orange-200 text-xs font-bold shrink-0">
              {(user?.fullName ?? "A").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.fullName ?? "Admin"}</p>
              <p className="text-gray-500 text-[10px]">Platform Administrator</p>
            </div>
            <button onClick={logout} className="text-gray-500 hover:text-red-400 transition-colors shrink-0" title="Logout">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-3 sticky top-0 z-10">
          <button className="lg:hidden text-gray-500 hover:text-gray-700 p-1" onClick={() => setDrawer(true)}>
            <Menu size={20} />
          </button>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">
              {NAV.find((n) => active(n.href))?.label ?? "Admin"}
            </p>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1 bg-orange-50 text-orange-600 rounded-full text-xs font-semibold border border-orange-200">
            <Shield size={11} /> Admin
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
