"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, Search, Pencil, Power } from "lucide-react";
import { adminApi } from "@/lib/api";

interface AdminRestaurant {
  _id: string;
  id: string;
  name: string;
  image: string;
  category: string;
  address: string;
  isOpen: boolean;
  isActive: boolean;
}

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [search, setSearch]           = useState("");
  const [filter, setFilter]           = useState<"all" | "active" | "inactive">("all");

  useEffect(() => {
    adminApi.restaurants()
      .then((res) => setRestaurants((res.restaurants as AdminRestaurant[]) ?? []))
      .catch(() => setError("Failed to load restaurants"))
      .finally(() => setLoading(false));
  }, []);

  async function toggleActive(r: AdminRestaurant) {
    try {
      await adminApi.updateRestaurant(r._id, { isActive: !r.isActive });
      setRestaurants((prev) => prev.map((x) => x._id === r._id ? { ...x, isActive: !r.isActive } : x));
    } catch (e) { alert((e as Error).message); }
  }

  async function toggleOpen(r: AdminRestaurant) {
    try {
      await adminApi.updateRestaurant(r._id, { isOpen: !r.isOpen });
      setRestaurants((prev) => prev.map((x) => x._id === r._id ? { ...x, isOpen: !r.isOpen } : x));
    } catch (e) { alert((e as Error).message); }
  }

  const filtered = restaurants.filter((r) => {
    const matchFilter = filter === "all" || (filter === "active" ? r.isActive : !r.isActive);
    const matchText   = !search || r.name.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchText;
  });

  const counts = {
    all:      restaurants.length,
    active:   restaurants.filter((r) => r.isActive).length,
    inactive: restaurants.filter((r) => !r.isActive).length,
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Restaurants</h1>
          <p className="text-sm text-gray-500 mt-0.5">{restaurants.length} restaurants on the platform</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 w-44" />
          </div>
          <Link href="/admin/restaurants/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors">
            <Plus size={14} /> Add
          </Link>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>}

      <div className="flex gap-1">
        {(["all","active","inactive"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${filter === f ? "bg-orange-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-orange-400"}`}>
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                <th className="px-5 py-3 text-left">Restaurant</th>
                <th className="px-3 py-3 text-left hidden md:table-cell">Address</th>
                <th className="px-3 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((r) => (
                <tr key={r._id} className={`hover:bg-gray-50 transition-colors ${!r.isActive ? "opacity-60" : ""}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden relative shrink-0 bg-gray-100">
                        {r.image && <Image src={r.image} alt={r.name} fill className="object-cover" sizes="40px" />}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{r.name}</p>
                        <p className="text-xs text-gray-400 capitalize">{r.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-gray-500 text-xs hidden md:table-cell">{r.address}</td>
                  <td className="px-3 py-3.5">
                    <div className="flex flex-col gap-1">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit ${r.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {r.isActive ? "Active" : "Inactive"}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit ${r.isOpen ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"}`}>
                        {r.isOpen ? "Open" : "Closed"}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 justify-end">
                      <button onClick={() => toggleOpen(r)} title={r.isOpen ? "Close" : "Open"}
                        className={`p-1.5 rounded-lg border text-xs transition-colors ${r.isOpen ? "border-blue-200 text-blue-500 hover:bg-blue-50" : "border-gray-200 text-gray-400 hover:bg-gray-50"}`}>
                        <Power size={13} />
                      </button>
                      <Link href={`/admin/restaurants/${r._id}`}
                        className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 transition-colors">
                        <Pencil size={13} />
                      </Link>
                      <button onClick={() => toggleActive(r)}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
                          r.isActive
                            ? "border-red-200 text-red-500 hover:bg-red-50"
                            : "border-green-200 text-green-600 hover:bg-green-50"
                        }`}>
                        {r.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="py-12 text-center text-sm text-gray-400">No restaurants found</div>}
      </div>
    </div>
  );
}
