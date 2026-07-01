"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import RestaurantCard from "@/components/ui/RestaurantCard";
import EmptyState from "@/components/ui/EmptyState";
import { useFavourites } from "@/context/FavouritesContext";
import { restaurantApi } from "@/lib/api";
import type { Restaurant } from "@/types/restaurant";

export default function FavoritesPage() {
  const { favourites } = useFavourites();
  const [all, setAll] = useState<Restaurant[]>([]);

  useEffect(() => {
    restaurantApi.list()
      .then(({ restaurants }) => setAll(restaurants as Restaurant[]))
      .catch(() => {});
  }, []);

  const favouriteRestaurants = all.filter((r) => favourites.has(r.id));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Favourites</h1>
              {favouriteRestaurants.length > 0 && (
                <p className="text-sm text-gray-400 mt-1">
                  {favouriteRestaurants.length}{" "}
                  {favouriteRestaurants.length === 1 ? "restaurant" : "restaurants"} saved
                </p>
              )}
            </div>
          </div>

          {favouriteRestaurants.length === 0 ? (
            <EmptyState
              icon={<Heart className="w-9 h-9" />}
              title="No favourites yet"
              description="Tap the heart on any restaurant to save it here for quick access."
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {favouriteRestaurants.map((r) => (
                <RestaurantCard
                  key={r.id}
                  id={r.id}
                  name={r.name}
                  image={r.image}
                  cuisine={r.cuisineTypes.join(", ")}
                  rating={r.rating}
                  deliveryTime={r.deliveryTime}
                  deliveryFee={r.deliveryFee === 0 ? "Free" : `$${r.deliveryFee.toFixed(2)}`}
                  isFree={r.deliveryFee === 0}
                  isOpen={r.isOpen}
                  tags={r.tags}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
