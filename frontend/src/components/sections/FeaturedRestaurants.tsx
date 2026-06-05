import Link from "next/link";
import { ChevronRight } from "lucide-react";
import RestaurantCard from "@/components/ui/RestaurantCard";
import type { Restaurant } from "@/types/restaurant";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export default async function FeaturedRestaurants() {
  let restaurants: Restaurant[] = [];
  try {
    const res = await fetch(`${API}/restaurants?sort=popular`, { next: { revalidate: 60 } });
    if (res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = (await res.json()) as { success: boolean; data?: { restaurants: any[] } };
      restaurants = ((json.data?.restaurants ?? []) as Restaurant[]).slice(0, 3);
    }
  } catch {
    // Backend offline — section is hidden gracefully
  }

  if (restaurants.length === 0) return null;

  return (
    <section className="py-14 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Featured Restaurants</h2>
          <Link
            href="/restaurants"
            className="flex items-center gap-1 text-sm font-semibold text-[#ff6b35] hover:text-[#e55a26] transition-colors"
          >
            See all
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants.map((r) => (
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
            />
          ))}
        </div>
      </div>
    </section>
  );
}
