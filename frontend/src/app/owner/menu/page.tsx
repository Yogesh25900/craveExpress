"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, Search, Pencil, Trash2, Leaf } from "lucide-react";
import { ownerApi } from "@/lib/api";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  isAvailable: boolean;
  isVeg: boolean;
  isPopular: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adapt(raw: any): MenuItem {
  return {
    id:          String(raw.id ?? raw._id),
    name:        String(raw.name ?? ""),
    description: String(raw.description ?? ""),
    price:       Number(raw.price ?? 0),
    image:       String(raw.image ?? ""),
    category:    String(raw.category ?? "Other"),
    isAvailable: raw.isAvailable !== false,
    isVeg:       Boolean(raw.isVeg),
    isPopular:   Boolean(raw.isPopular),
  };
}

const FALLBACK_IMG = "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=56&h=56&fit=crop&q=80";

export default function OwnerMenuPage() {
  const [items, setItems]     = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [catFilter, setCat]   = useState("all");
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    ownerApi.getMenu()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ items: raw }) => setItems((raw as any[]).map(adapt)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggleAvail(item: MenuItem) {
    if (toggling) return;
    setToggling(item.id);
    const next = !item.isAvailable;
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, isAvailable: next } : i));
    try {
      await ownerApi.updateMenuItem(item.id, { isAvailable: next });
    } catch {
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, isAvailable: item.isAvailable } : i));
    } finally { setToggling(null); }
  }

  async function removeItem(id: string) {
    if (deleting) return;
    setDeleting(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await ownerApi.deleteMenuItem(id);
    } catch {
      // Re-fetch to restore if failed
      ownerApi.getMenu()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then(({ items: raw }) => setItems((raw as any[]).map(adapt)))
        .catch(() => {});
    } finally { setDeleting(null); }
  }

  const categories = Array.from(new Set(items.map((i) => i.category)));

  const filtered = items.filter((i) => {
    const matchCat  = catFilter === "all" || i.category === catFilter;
    const matchText = !search || i.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchText;
  });

  const grouped = categories
    .filter((c) => catFilter === "all" || c === catFilter)
    .map((cat) => ({ cat, items: filtered.filter((i) => i.category === cat) }))
    .filter((g) => g.items.length > 0);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Menu</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} items across {categories.length} categories</p>
        </div>
        <Link href="/owner/menu/new"
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors">
          <Plus size={15} /> Add Item
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 w-48"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={() => setCat("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${catFilter === "all" ? "bg-green-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-green-400"}`}>
            All
          </button>
          {categories.map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${catFilter === c ? "bg-green-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-green-400"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <p className="text-gray-400 text-sm">No items found</p>
          {items.length === 0 && (
            <Link href="/owner/menu/new" className="mt-3 inline-flex items-center gap-1.5 text-sm text-green-600 hover:underline">
              <Plus size={14} /> Add your first item
            </Link>
          )}
        </div>
      ) : (
        grouped.map(({ cat, items: catItems }) => (
          <div key={cat} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-700 capitalize">{cat}</h2>
              <span className="text-xs text-gray-400">{catItems.length} items</span>
            </div>
            <div className="divide-y divide-gray-100">
              {catItems.map((item) => (
                <div key={item.id} className="px-5 py-3.5 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg overflow-hidden relative shrink-0 bg-gray-100">
                    <Image src={item.image || FALLBACK_IMG} alt={item.name} fill className="object-cover" sizes="56px" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                      {item.isVeg && <Leaf size={12} className="text-green-600 shrink-0" />}
                      {item.isPopular && <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Popular</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.description}</p>
                    <p className="text-sm font-bold text-gray-800 mt-0.5">${item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button onClick={() => toggleAvail(item)} disabled={toggling === item.id}
                      className="flex items-center gap-1.5 text-xs font-medium transition-colors disabled:opacity-50">
                      <span className={`relative w-8 h-4 rounded-full transition-colors ${item.isAvailable ? "bg-green-500" : "bg-gray-300"}`}>
                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${item.isAvailable ? "translate-x-4" : "translate-x-0.5"}`} />
                      </span>
                      <span className={item.isAvailable ? "text-green-600" : "text-gray-400"}>
                        {item.isAvailable ? "Available" : "Off"}
                      </span>
                    </button>
                    <Link href={`/owner/menu/${item.id}/edit`}
                      className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 transition-colors">
                      <Pencil size={13} />
                    </Link>
                    <button onClick={() => removeItem(item.id)} disabled={deleting === item.id}
                      className="p-1.5 rounded-lg border border-gray-200 bg-white hover:border-red-300 hover:text-red-500 text-gray-400 transition-colors disabled:opacity-40">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
