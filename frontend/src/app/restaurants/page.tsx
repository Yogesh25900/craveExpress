"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Search, SlidersHorizontal, X, ChevronDown, Navigation, MapIcon, List, Navigation2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import RestaurantCard from "@/components/ui/RestaurantCard";
import CategoryPill from "@/components/ui/CategoryPill";
import SkeletonCard from "@/components/ui/SkeletonCard";
import EmptyState from "@/components/ui/EmptyState";
import { categoryApi, restaurantApi } from "@/lib/api";
import { useGeolocation } from "@/hooks/useGeolocation";
import { formatDistance } from "@/lib/geo";
import type { Restaurant } from "@/types/restaurant";

// Dynamic import — Leaflet requires window
const RestaurantMarkerMap = dynamic(
  () => import("@/components/map/RestaurantMarkerMap"),
  { ssr: false, loading: () => <div className="h-[500px] w-full rounded-2xl bg-gray-100 animate-pulse" /> }
);

type SortKey = "popular" | "rating" | "fastest" | "free" | "nearest";
type ViewMode = "list" | "map";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "popular",  label: "Most Popular" },
  { value: "rating",   label: "Top Rated" },
  { value: "fastest",  label: "Fastest Delivery" },
  { value: "free",     label: "Free Delivery" },
  { value: "nearest",  label: "Nearest First" },
];

function parseMinutes(time: string) {
  return parseInt(time.split("-")[0], 10);
}

export default function RestaurantsPage() {
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading]           = useState(true);
  const [platformCats, setPlatformCats]     = useState<{ id: string; name: string; emoji: string }[]>([]);
  const [viewMode, setViewMode]             = useState<ViewMode>("list");

  const [search, setSearch]                 = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [sort, setSort]                     = useState<SortKey>("popular");
  const [sortOpen, setSortOpen]             = useState(false);
  const sortRef                             = useRef<HTMLDivElement>(null);

  const { coords, status: geoStatus, request: requestLocation } = useGeolocation();

  // Read ?category= and ?search= from URL on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const cat = p.get("category");
      const q   = p.get("search");
      if (cat) setActiveCategory(cat);
      if (q)   setSearch(q);
    }
  }, []);

  // Close sort dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    categoryApi.list()
      .then(({ categories }) => setPlatformCats(categories))
      .catch(() => {});
  }, []);

  const fetchRestaurants = useCallback(async (lat?: number, lng?: number) => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number | undefined> = {};
      if (lat !== undefined && lng !== undefined) {
        params.lat = lat;
        params.lng = lng;
      }
      const { restaurants } = await restaurantApi.list(params);
      setAllRestaurants(restaurants as Restaurant[]);
    } catch { /* show empty */ }
    finally { setIsLoading(false); }
  }, []);

  // Initial load (no coords yet)
  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  // Re-fetch when coords become available
  useEffect(() => {
    if (coords) fetchRestaurants(coords.lat, coords.lng);
  }, [coords, fetchRestaurants]);

  const filtered = useMemo(() => {
    let list = [...allRestaurants];

    if (activeCategory !== "all") {
      list = list.filter((r) => r.category === activeCategory);
    }
    if (sort === "free") {
      list = list.filter((r) => r.deliveryFee === 0);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.cuisineTypes.some((c) => c.toLowerCase().includes(q))
      );
    }

    switch (sort) {
      case "rating":   list.sort((a, b) => b.rating - a.rating); break;
      case "fastest":  list.sort((a, b) => parseMinutes(a.deliveryTime) - parseMinutes(b.deliveryTime)); break;
      case "nearest":
        // distance is set by backend; restaurants without it go last
        list.sort((a, b) => {
          if (a.distance === undefined && b.distance === undefined) return 0;
          if (a.distance === undefined) return 1;
          if (b.distance === undefined) return -1;
          return a.distance - b.distance;
        });
        break;
      default: list.sort((a, b) => b.reviewCount - a.reviewCount);
    }

    return list;
  }, [allRestaurants, search, activeCategory, sort]);

  const activeSortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Sort";
  const allCategories   = [{ id: "all", name: "All", emoji: "🍽️" }, ...platformCats];

  function handleLocationClick() {
    if (geoStatus === "granted" && coords) return; // already have it
    requestLocation();
    setSort("nearest");
  }

  const locationButtonLabel =
    geoStatus === "requesting" ? "Locating…"
    : geoStatus === "granted"  ? "Near you"
    : geoStatus === "denied"   ? "Location denied"
    : "Near me";

  const nearbyCount = allRestaurants.filter((r) => r.distance !== undefined).length;

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-gray-50">
        {/* Page header */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {geoStatus === "granted" ? "Restaurants near you" : "Restaurants"}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {isLoading
                    ? "Loading…"
                    : geoStatus === "granted" && nearbyCount > 0
                    ? `${nearbyCount} restaurants delivering to your location`
                    : `${allRestaurants.length} restaurants available`}
                </p>
              </div>

              {/* View toggle */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                    viewMode === "list"
                      ? "bg-[#ff6b35] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <List className="w-4 h-4" /> List
                </button>
                <button
                  onClick={() => setViewMode("map")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                    viewMode === "map"
                      ? "bg-[#ff6b35] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <MapIcon className="w-4 h-4" /> Map
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky filter bar */}
        <div className="sticky top-16 z-20 bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-3">

            {/* Search + Sort + Location row */}
            <div className="flex gap-2 sm:gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search restaurants or cuisines…"
                  className="w-full pl-10 pr-9 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/30 focus:border-[#ff6b35] transition-colors"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Location button */}
              <button
                onClick={handleLocationClick}
                disabled={geoStatus === "requesting" || geoStatus === "denied"}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-full text-sm font-medium border transition-colors shrink-0 ${
                  geoStatus === "granted"
                    ? "bg-blue-50 border-blue-300 text-blue-700"
                    : geoStatus === "denied"
                    ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-white border-gray-200 text-gray-600 hover:border-[#ff6b35] hover:text-[#ff6b35]"
                }`}
              >
                {geoStatus === "granted" ? <Navigation2 className="w-4 h-4 fill-blue-500" /> : <Navigation className="w-4 h-4" />}
                <span className="hidden sm:inline">{locationButtonLabel}</span>
              </button>

              {/* Sort dropdown */}
              <div className="relative shrink-0" ref={sortRef}>
                <button
                  onClick={() => setSortOpen((v) => !v)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:border-[#ff6b35] hover:text-[#ff6b35] transition-colors"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="hidden sm:inline">{activeSortLabel}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
                </button>
                {sortOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl border border-gray-100 shadow-lg py-1.5 z-50">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setSort(opt.value); setSortOpen(false); }}
                        disabled={opt.value === "nearest" && geoStatus !== "granted"}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                          sort === opt.value
                            ? "text-[#ff6b35] font-semibold bg-[#fff3ef]"
                            : opt.value === "nearest" && geoStatus !== "granted"
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {opt.label}
                        {opt.value === "nearest" && geoStatus !== "granted" && (
                          <span className="text-[10px] block text-gray-400">Enable location first</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Category pills */}
            <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
              {allCategories.map((cat) => (
                <CategoryPill
                  key={cat.id}
                  label={cat.name}
                  emoji={cat.emoji}
                  active={activeCategory === cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Active filter chips */}
          {(activeCategory !== "all" || sort !== "popular") && (
            <div className="flex flex-wrap gap-2 mb-5">
              {activeCategory !== "all" && (
                <CategoryPill
                  label={allCategories.find((c) => c.id === activeCategory)?.name ?? ""}
                  active
                  removable
                  onRemove={() => setActiveCategory("all")}
                />
              )}
              {sort !== "popular" && (
                <CategoryPill
                  label={activeSortLabel}
                  active
                  removable
                  onRemove={() => setSort("popular")}
                />
              )}
            </div>
          )}

          {!isLoading && viewMode === "list" && (
            <p className="text-sm text-gray-500 mb-5">
              <span className="font-semibold text-gray-800">{filtered.length}</span>{" "}
              {filtered.length === 1 ? "restaurant" : "restaurants"} found
            </p>
          )}

          {/* Map view */}
          {viewMode === "map" && !isLoading && (
            <div className="mb-8">
              {filtered.length > 0 ? (
                <RestaurantMarkerMap
                  key={`${coords?.lat}-${coords?.lng}`}
                  restaurants={filtered}
                  userLat={coords?.lat}
                  userLng={coords?.lng}
                  className="h-[500px] w-full rounded-2xl overflow-hidden shadow-sm border border-gray-100"
                />
              ) : (
                <div className="h-64 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                  No restaurants to show on map
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2 text-center">Click a restaurant pin to see details and order</p>
            </div>
          )}

          {/* Location permission prompt */}
          {geoStatus === "idle" && viewMode === "list" && (
            <div className="mb-5 flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <Navigation className="w-5 h-5 text-blue-500 shrink-0" />
              <p className="text-sm text-blue-700 flex-1">
                Enable location to see restaurants near you, sorted by distance.
              </p>
              <button
                onClick={handleLocationClick}
                className="text-sm font-semibold text-blue-700 hover:text-blue-900 shrink-0"
              >
                Enable
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Search className="w-8 h-8" />}
              title="No restaurants found"
              description="Try a different search term or remove some filters."
              action={
                <button
                  onClick={() => { setSearch(""); setActiveCategory("all"); setSort("popular"); }}
                  className="px-6 py-3 bg-[#ff6b35] text-white font-semibold rounded-full hover:bg-[#e55a26] transition-colors text-sm"
                >
                  Clear filters
                </button>
              }
            />
          ) : viewMode === "list" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((r) => (
                <RestaurantCard
                  key={r.id}
                  id={r.id}
                  name={r.name}
                  image={r.image}
                  cuisine={r.cuisineTypes.join(" • ")}
                  rating={r.rating}
                  deliveryTime={r.deliveryTime}
                  deliveryFee={r.deliveryFee === 0 ? "" : `$${r.deliveryFee.toFixed(2)}`}
                  isFree={r.deliveryFee === 0}
                  isOpen={r.isOpen}
                  tags={r.tags}
                  distance={r.distance}
                />
              ))}
            </div>
          ) : (
            /* Map view: compact list below the map */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((r) => (
                <RestaurantCard
                  key={r.id}
                  id={r.id}
                  name={r.name}
                  image={r.image}
                  cuisine={r.cuisineTypes.join(" • ")}
                  rating={r.rating}
                  deliveryTime={r.deliveryTime}
                  deliveryFee={r.deliveryFee === 0 ? "" : `$${r.deliveryFee.toFixed(2)}`}
                  isFree={r.deliveryFee === 0}
                  isOpen={r.isOpen}
                  tags={r.tags}
                  distance={r.distance}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
