"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Search, MapPin, ShoppingCart, UtensilsCrossed,
  ChevronDown, User, ClipboardList, Heart, LogOut,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

// ─── Avatar initials helper ────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ─── User dropdown ─────────────────────────────────────────────────────────

function UserDropdown() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 py-1.5 px-2 rounded-full hover:bg-gray-100 transition-colors"
      >
        <div className="relative w-8 h-8 rounded-full bg-[#ff6b35] flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
          {user.avatar ? (
            <Image src={user.avatar} alt={user.fullName} fill className="object-cover" unoptimized />
          ) : (
            getInitials(user.fullName)
          )}
        </div>
        <span className="text-sm font-medium text-gray-700 hidden sm:block max-w-[100px] truncate">
          {user.fullName.split(" ")[0]}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform hidden sm:block ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-gray-100 shadow-lg py-1.5 z-50">
          <div className="px-4 py-2.5 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.fullName}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>

          {[
            { href: "/profile", icon: <User className="w-4 h-4" />, label: "Profile" },
            { href: "/orders", icon: <ClipboardList className="w-4 h-4" />, label: "My Orders" },
            { href: "/favorites", icon: <Heart className="w-4 h-4" />, label: "Favourites" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#ff6b35] transition-colors"
            >
              <span className="text-gray-400">{item.icon}</span>
              {item.label}
            </Link>
          ))}

          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              onClick={() => { setOpen(false); logout(); }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Navbar ────────────────────────────────────────────────────────────────

export default function Navbar() {
  const { isAuthenticated, isInitialised } = useAuth();
  const { itemCount } = useCart();
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  function handleSearch() {
    const q = searchQuery.trim();
    if (q) router.push(`/restaurants?search=${encodeURIComponent(q)}`);
    else router.push("/restaurants");
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-[#ff6b35] rounded-lg flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold text-gray-900 hidden sm:block">
              CraveExpress
            </span>
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-md hidden md:flex">
            <div className="relative w-full">
              <button
                onClick={handleSearch}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#ff6b35] transition-colors"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search restaurants or dishes…"
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/30 focus:border-[#ff6b35] transition-colors"
              />
            </div>
          </div>

          {/* Nav links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link
              href="/restaurants"
              className={`hover:text-[#ff6b35] transition-colors ${
                pathname.startsWith("/restaurants") ? "text-[#ff6b35]" : ""
              }`}
            >
              Restaurants
            </Link>
            <Link href="#" className="hover:text-[#ff6b35] transition-colors">
              Offers
            </Link>
          </nav>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-2">
            {/* Auth — only render after hydration to avoid SSR mismatch */}
            {isInitialised && (
              isAuthenticated ? (
                <UserDropdown />
              ) : (
                <>
                  <Link
                    href="/login"
                    className="hidden sm:flex items-center text-sm font-medium text-gray-600 hover:text-[#ff6b35] transition-colors px-3 py-2"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-[#ff6b35] hover:bg-[#e55a26] text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
                  >
                    Sign Up
                  </Link>
                </>
              )
            )}

            <button
              aria-label="Set delivery location"
              className="p-2.5 text-gray-600 hover:text-[#ff6b35] transition-colors hidden md:flex min-w-[44px] min-h-[44px] items-center justify-center"
            >
              <MapPin className="w-5 h-5" />
            </button>

            <Link href="/cart" aria-label="View cart" className="relative p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 hover:text-[#ff6b35] transition-colors">
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] bg-[#ff6b35] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </Link>
          </div>

        </div>
      </div>
    </header>
  );
}
