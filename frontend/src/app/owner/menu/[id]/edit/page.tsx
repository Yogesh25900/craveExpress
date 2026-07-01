"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Leaf, Star, Eye } from "lucide-react";
import { ownerApi } from "@/lib/api";

interface AddonRow { name: string; price: string }

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=280&fit=crop&q=80";

export default function EditMenuItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [name, setName]           = useState("");
  const [desc, setDesc]           = useState("");
  const [price, setPrice]         = useState("");
  const [category, setCategory]   = useState("");
  const [imageUrl, setImageUrl]   = useState("");
  const [isVeg, setIsVeg]         = useState(false);
  const [isPopular, setIsPopular] = useState(false);
  const [isAvail, setIsAvail]     = useState(true);
  const [addons, setAddons]       = useState<AddonRow[]>([]);
  const [saving, setSaving]       = useState(false);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [notFound, setNotFound]   = useState(false);

  useEffect(() => {
    ownerApi.getMenu()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ items }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const item = (items as any[]).find((i) => String(i.id ?? i._id) === id);
        if (!item) { setNotFound(true); return; }
        setName(item.name ?? "");
        setDesc(item.description ?? "");
        setPrice(String(item.price ?? ""));
        setCategory(item.category ?? "");
        setImageUrl(item.image ?? "");
        setIsVeg(Boolean(item.isVeg));
        setIsPopular(Boolean(item.isPopular));
        setIsAvail(item.isAvailable !== false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAddons((item.addons ?? []).map((a: any) => ({ name: String(a.name), price: String(a.price ?? 0) })));
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  function addAddon()  { setAddons((a) => [...a, { name: "", price: "" }]); }
  function removeAddon(i: number) { setAddons((a) => a.filter((_, idx) => idx !== i)); }
  function updateAddon(i: number, field: "name" | "price", val: string) {
    setAddons((a) => a.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  }

  async function handleSave() {
    setError("");
    if (!name.trim())                       return setError("Item name is required.");
    if (!price || isNaN(parseFloat(price))) return setError("Enter a valid price.");
    setSaving(true);
    try {
      await ownerApi.updateMenuItem(id, {
        name:        name.trim(),
        description: desc.trim(),
        price:       parseFloat(price),
        category:    category || "Other",
        image:       imageUrl.trim() || PLACEHOLDER_IMG,
        isVeg,
        isPopular,
        isAvailable: isAvail,
        addons: addons
          .filter((a) => a.name.trim())
          .map((a) => ({ name: a.name.trim(), price: parseFloat(a.price) || 0 })),
      });
      router.push("/owner/menu");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
      setSaving(false);
    }
  }

  const previewImg   = imageUrl || PLACEHOLDER_IMG;
  const previewPrice = parseFloat(price) || 0;

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="max-w-xl py-16 text-center">
      <p className="text-gray-400 text-sm">Item not found.</p>
      <Link href="/owner/menu" className="text-green-600 text-sm hover:underline mt-2 block">← Back to Menu</Link>
    </div>
  );

  const inputCls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500";

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/owner/menu" className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Edit Item</h1>
          <p className="text-sm text-gray-500 mt-0.5">{name || "Menu item"}</p>
        </div>
      </div>

      {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}

      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Basic Info</h2>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Item Name <span className="text-red-500">*</span></label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Price ($) <span className="text-red-500">*</span></label>
                <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Category</label>
                <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Mains" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Image URL</label>
              <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://images.unsplash.com/…" className={inputCls} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Add-ons / Extras</h2>
              <button onClick={addAddon} className="flex items-center gap-1 text-xs font-semibold text-green-600 hover:text-green-700 transition-colors">
                <Plus size={13} /> Add option
              </button>
            </div>
            {addons.length === 0 && <p className="text-xs text-gray-400 py-2">No add-ons yet.</p>}
            {addons.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="text" value={row.name} onChange={(e) => updateAddon(i, "name", e.target.value)}
                  placeholder="Option name" className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500" />
                <div className="relative w-24 shrink-0">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" min="0" step="0.01" value={row.price} onChange={(e) => updateAddon(i, "price", e.target.value)}
                    placeholder="0.00" className="w-full pl-6 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500" />
                </div>
                <button onClick={() => removeAddon(i)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-1.5 mb-3">
              <Eye size={13} className="text-gray-400" />
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Preview</h2>
            </div>
            <div className="rounded-xl overflow-hidden border border-gray-100">
              <div className="relative h-36 bg-gray-100">
                <Image src={previewImg} alt={name || "Item"} fill className="object-cover" sizes="300px" />
              </div>
              <div className="p-3">
                <p className="font-semibold text-gray-900 text-sm">{name || "Item Name"}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-sm font-bold text-gray-800">${previewPrice > 0 ? previewPrice.toFixed(2) : "0.00"}</span>
                  {isPopular && <span className="flex items-center gap-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full"><Star size={9} /> Popular</span>}
                  {isVeg    && <span className="flex items-center gap-0.5 text-[10px] font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full"><Leaf size={9} /> Veg</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Flags</h2>
            {[
              { label: "Available",       sub: "Visible to customers",   val: isAvail,   set: setIsAvail   },
              { label: "Mark as Popular", sub: "Show Popular badge",     val: isPopular, set: setIsPopular },
              { label: "Vegetarian",      sub: "Show the veg leaf icon", val: isVeg,     set: setIsVeg     },
            ].map(({ label, sub, val, set }) => (
              <div key={label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400">{sub}</p>
                </div>
                <button onClick={() => set(!val)} className={`relative w-9 h-5 rounded-full transition-colors ${val ? "bg-green-500" : "bg-gray-300"}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${val ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <button onClick={handleSave} disabled={saving}
              className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition-colors">
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <Link href="/owner/menu" className="w-full py-3 text-center border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-semibold text-sm rounded-xl transition-colors">
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
