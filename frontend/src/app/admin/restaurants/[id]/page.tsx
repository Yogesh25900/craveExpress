"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { adminApi } from "@/lib/api";

interface AdminRestaurant {
  _id: string; id: string; name: string; image: string; banner: string;
  category: string; address: string; isOpen: boolean; isActive: boolean;
  deliveryFee: number; minOrder: number; deliveryTime: string;
  cuisineTypes: string[]; tags: string[];
}

const CATEGORIES = ["burgers","pizza","healthy","sushi","desserts","nepali","drinks","tacos"];

export default function AdminRestaurantEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }  = use(params);
  const router  = useRouter();
  const isNew   = id === "new";

  const [loading, setLoading]   = useState(!isNew);
  const [error, setError]       = useState("");
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [name, setName]             = useState("");
  const [slug, setSlug]             = useState("");
  const [address, setAddress]       = useState("");
  const [category, setCategory]     = useState(CATEGORIES[0]);
  const [imageUrl, setImg]          = useState("");
  const [bannerUrl, setBanner]      = useState("");
  const [deliveryFee, setFee]       = useState(2.99);
  const [minOrder, setMin]          = useState(10);
  const [deliveryTime, setDT]       = useState("30-45 min");
  const [isActive, setActive]       = useState(true);
  const [isOpen, setOpen]           = useState(true);

  useEffect(() => {
    if (isNew) return;
    adminApi.restaurants()
      .then((res) => {
        const list = (res.restaurants as AdminRestaurant[]) ?? [];
        const r = list.find((x) => x._id === id);
        if (!r) { setNotFound(true); return; }
        setName(r.name ?? ""); setSlug(r.id ?? ""); setAddress(r.address ?? "");
        setCategory(r.category ?? CATEGORIES[0]); setImg(r.image ?? "");
        setBanner(r.banner ?? ""); setFee(r.deliveryFee ?? 2.99);
        setMin(r.minOrder ?? 10); setDT(r.deliveryTime ?? "30-45 min");
        setActive(r.isActive ?? true); setOpen(r.isOpen ?? true);
      })
      .catch(() => setError("Failed to load restaurant"))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  async function handleSave() {
    if (!name.trim()) return setError("Name is required.");
    if (isNew && !slug.trim()) return setError("Slug is required.");
    if (isNew && !imageUrl.trim()) return setError("Image URL is required.");
    if (isNew && !bannerUrl.trim()) return setError("Banner URL is required.");
    setSaving(true);
    setError("");
    try {
      if (isNew) {
        await adminApi.createRestaurant({
          slug: slug.trim(), name: name.trim(), image: imageUrl.trim(), banner: bannerUrl.trim(),
          category, address: address.trim(), isOpen, isActive,
          deliveryFee, minOrder, deliveryTime, cuisineTypes: [], tags: [],
        });
      } else {
        await adminApi.updateRestaurant(id, {
          name: name.trim(), address: address.trim(), category,
          image: imageUrl.trim() || undefined, banner: bannerUrl.trim() || undefined,
          isOpen, isActive, deliveryFee, minOrder, deliveryTime,
        });
      }
      setSaved(true);
      setTimeout(() => router.push("/admin/restaurants"), 1000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="max-w-xl py-16 text-center">
      <p className="text-gray-400 text-sm">Restaurant not found.</p>
      <Link href="/admin/restaurants" className="text-orange-500 text-sm hover:underline mt-2 block">← Back</Link>
    </div>
  );

  const preview = imageUrl || "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=280&fit=crop&q=80";

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/restaurants" className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">{isNew ? "Add Restaurant" : "Edit Restaurant"}</h1>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>}

      <div className="grid sm:grid-cols-3 gap-5">
        <div className="sm:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Details</h2>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
            </div>

            {isNew && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Slug * <span className="text-gray-400 font-normal">(URL-friendly ID, e.g. my-restaurant)</span></label>
                <input type="text" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,""))}
                  placeholder="my-restaurant"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 font-mono" />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Address</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 bg-white capitalize">
                  {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Delivery Time</label>
                <input type="text" value={deliveryTime} onChange={(e) => setDT(e.target.value)} placeholder="30-45 min"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Delivery Fee ($)</label>
                <input type="number" min="0" step="0.5" value={deliveryFee} onChange={(e) => setFee(+e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Min Order ($)</label>
                <input type="number" min="0" step="1" value={minOrder} onChange={(e) => setMin(+e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Thumbnail Image URL {isNew && "*"}</label>
              <input type="url" value={imageUrl} onChange={(e) => setImg(e.target.value)} placeholder="https://images.unsplash.com/…"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Banner Image URL {isNew && "*"}</label>
              <input type="url" value={bannerUrl} onChange={(e) => setBanner(e.target.value)} placeholder="https://images.unsplash.com/…"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Visibility</h2>
            {[
              { label: "Active on Platform", sub: "Visible in restaurant listing", val: isActive, set: setActive },
              { label: "Currently Open",     sub: "Accepting orders right now",    val: isOpen,   set: setOpen   },
            ].map(({ label, sub, val, set }) => (
              <div key={label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400">{sub}</p>
                </div>
                <button onClick={() => set(!val)} className={`relative w-9 h-5 rounded-full transition-colors ${val ? "bg-orange-500" : "bg-gray-300"}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${val ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Preview</p>
            <div className="rounded-xl overflow-hidden border border-gray-100">
              <div className="relative h-28 bg-gray-100">
                <Image src={preview} alt={name || "Restaurant"} fill className="object-cover" sizes="200px" />
              </div>
              <div className="p-3">
                <p className="font-semibold text-gray-900 text-sm">{name || "Restaurant Name"}</p>
                <p className="text-xs text-gray-400 capitalize mt-0.5">{category}</p>
              </div>
            </div>
          </div>

          <button onClick={handleSave} disabled={saving}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
              saved ? "bg-green-100 text-green-700 border border-green-300"
                    : "bg-orange-500 hover:bg-orange-600 text-white"
            } disabled:opacity-60`}>
            {saved ? <><Check size={14} /> Saved!</> : saving ? "Saving…" : "Save Changes"}
          </button>
          <Link href="/admin/restaurants" className="w-full py-3 text-center block border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-semibold text-sm rounded-xl transition-colors">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
