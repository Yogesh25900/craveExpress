import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import SingleLocationMap from "@/components/map/SingleLocationMap";
import { ArrowLeft, Clock, Bike, ShoppingBag, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import StarRating from "@/components/ui/StarRating";
import MenuTabs from "@/components/restaurant/MenuTabs";
import type { Restaurant, MenuItem, MenuCategory } from "@/types/restaurant";

// `SingleLocationMap` is a Client Component (`use client`) and therefore
// can be imported normally from a Server Component.

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeJson(res: Response): Promise<any> {
  return res.ok ? res.json() : Promise.resolve(null);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await fetch(`${API}/restaurants/${id}`, { next: { revalidate: 60 } });
    if (res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = (await res.json()) as { data?: { restaurant: any } };
      const r = json.data?.restaurant;
      if (r) return { title: `${r.name} — CraveExpress`, description: `Order from ${r.name}.` };
    }
  } catch { /* fallback */ }
  return { title: "Restaurant — CraveExpress" };
}

export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [rRes, mRes, revRes] = await Promise.all([
    fetch(`${API}/restaurants/${id}`, { next: { revalidate: 60 } }),
    fetch(`${API}/restaurants/${id}/menu`, { next: { revalidate: 60 } }),
    fetch(`${API}/restaurants/${id}/reviews`, { next: { revalidate: 60 } }),
  ]);

  if (!rRes.ok) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rJson, mJson, revJson] = await Promise.all([
    safeJson(rRes),
    safeJson(mRes),
    safeJson(revRes),
  ]);

  const restaurant = rJson?.data?.restaurant as Restaurant | undefined;
  if (!restaurant) notFound();

  const items: MenuItem[]       = (mJson?.data?.items ?? []) as MenuItem[];
  const categories: MenuCategory[] = (mJson?.data?.categories ?? []) as MenuCategory[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawReviews: any[] = revJson?.data?.reviews ?? [];

  interface ReviewShape {
    id: string;
    userName: string;
    rating: number;
    comment: string;
    date: string;
    avatarColor: string;
  }

  const reviews: ReviewShape[] = rawReviews.map((r) => ({
    id: String(r._id ?? r.id ?? ""),
    userName: String(r.userName ?? "Anonymous"),
    rating: Number(r.rating ?? 0),
    comment: String(r.comment ?? ""),
    date: String(r.createdAt ?? r.date ?? ""),
    avatarColor: String(r.avatarColor ?? "bg-orange-500"),
  }));

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : restaurant.rating.toFixed(1);

  const breakdown = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => r.rating === star).length;
    return {
      star,
      count,
      pct: reviews.length ? Math.round((count / reviews.length) * 100) : 0,
    };
  });

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-gray-50 pb-16">
        {/* Banner */}
        <div className="relative h-52 sm:h-64 w-full overflow-hidden bg-gray-200">
          <Image
            src={restaurant.banner}
            alt={restaurant.name}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          <Link
            href="/restaurants"
            className="absolute top-4 left-4 sm:top-5 sm:left-6 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-800" />
          </Link>

          {!restaurant.isOpen && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="bg-white text-gray-800 font-bold px-4 py-2 rounded-full text-sm">
                Currently Closed
              </span>
            </div>
          )}
        </div>

        {/* Restaurant info card */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm -mt-8 relative z-10 p-5 sm:p-6 mb-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{restaurant.name}</h1>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {restaurant.cuisineTypes.map((c) => (
                    <span key={c} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                      {c}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {restaurant.address}
                </div>
              </div>

              <div className="flex flex-col items-center bg-[#fff3ef] rounded-2xl px-4 py-3 shrink-0 min-w-[80px]">
                <span className="text-2xl font-extrabold text-[#ff6b35]">{avgRating}</span>
                <StarRating rating={parseFloat(avgRating)} size="sm" />
                <span className="text-[10px] text-gray-400 mt-0.5">{reviews.length} reviews</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100 text-sm">
              <div className="flex items-center gap-1.5 text-gray-600">
                <Clock className="w-4 h-4 text-[#ff6b35]" />
                <span>{restaurant.deliveryTime}</span>
              </div>
              <div className={`flex items-center gap-1.5 font-medium ${restaurant.deliveryFee === 0 ? "text-green-600" : "text-gray-600"}`}>
                <Bike className="w-4 h-4 text-[#ff6b35]" />
                <span>{restaurant.deliveryFee === 0 ? "Free delivery" : `$${restaurant.deliveryFee.toFixed(2)} delivery`}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600">
                <ShoppingBag className="w-4 h-4 text-[#ff6b35]" />
                <span>Min. ${restaurant.minOrder.toFixed(2)}</span>
              </div>
            </div>

            {restaurant.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {restaurant.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-[#fff3ef] text-[#ff6b35] font-semibold px-3 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Menu */}
        {categories.length > 0 && items.length > 0 ? (
          <MenuTabs restaurantId={id} categories={categories} items={items} />
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center text-gray-400">
            Menu coming soon.
          </div>
        )}

        {/* Location map */}
        {restaurant.location?.coordinates && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Location</h2>
              <SingleLocationMap
                lat={restaurant.location.coordinates[1]}
                lng={restaurant.location.coordinates[0]}
                name={restaurant.name}
                className="h-56 w-full rounded-xl overflow-hidden"
              />
              <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#ff6b35] shrink-0" />
                {restaurant.address}
              </p>
            </div>
          </section>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-5">Ratings &amp; Reviews</h2>

              <div className="flex flex-col sm:flex-row gap-8 mb-6">
                <div className="flex flex-col items-center justify-center shrink-0 sm:border-r sm:border-gray-100 sm:pr-8">
                  <span className="text-5xl font-extrabold text-gray-900">{avgRating}</span>
                  <StarRating rating={parseFloat(avgRating)} reviewCount={reviews.length} size="md" />
                </div>

                <div className="flex-1 space-y-2">
                  {breakdown.map(({ star, count, pct }) => (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="w-4 text-gray-500 shrink-0">{star}</span>
                      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-400 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-5 text-gray-400 shrink-0 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div key={rev.id} className="flex gap-3 py-4 border-t border-gray-50">
                    <div className={`w-9 h-9 rounded-full ${rev.avatarColor} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                      {rev.userName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800">{rev.userName}</span>
                        <StarRating rating={rev.rating} size="sm" />
                        {rev.date && (
                          <span className="text-xs text-gray-400">
                            {new Date(rev.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">{rev.comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}
