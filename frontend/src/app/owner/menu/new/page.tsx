"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Leaf, Star, Eye } from "lucide-react";
import { ownerApi } from "@/lib/api";

interface AddonRow { name: string; price: string }

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=280&fit=crop&q=80";

export default function NewMenuItemPage() {
  const router = useRouter();

  const [name, setName]           = useState("");
  const [desc, setDesc]           = useState("");
  const [price, setPrice]         = useState("");
  const [category, setCategory]   = useState("");
  const [newCat, setNewCat]       = useState("");
  const [imageUrl, setImageUrl]   = useState("");
  const [isVeg, setIsVeg]         = useState(false);
  const [isPopular, setIsPopular] = useState(false);
  const [isAvail, setIsAvail]     = useState(true);
  const [addons, setAddons]       = useState<AddonRow[]>([]);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const resolvedCat = category === "__new__" ? newCat.trim() : category;
  const previewImg  = imageUrl || PLACEHOLDER_IMG;
  const previewPrice = parseFloat(price) || 0;

  function addAddon() { setAddons((a) => [...a, { name: "", price: "" }]); }
  function removeAddon(i: number) { setAddons((a) => a.filter((_, idx) => idx !== i)); }
  function updateAddon(i: number, field: "name" | "price", val: string) {
    setAddons((a) => a.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  }

  async function handleSave() {
    setError("");
    if (!name.trim())                         return setError("Item name is required.");
    if (!price || isNaN(parseFloat(price)))   return setError("Enter a valid price.");
    if (!resolvedCat)                         return setError("Select or enter a category.");
    if (!imageUrl.trim())                     return setError("Image URL is required.");

    setSaving(true);
    try {
      await ownerApi.createMenuItem({
        name:        name.trim(),
        description: desc.trim(),
        price:       parseFloat(price),
        category:    resolvedCat,
        image:       imageUrl.trim(),
        isVeg,
        isPopular,
        isAvailable: isAvail,
        addons: addons
          .filter((a) => a.name.trim())
          .map((a) => ({ name: a.name.trim(), price: parseFloat(a.price) || 0 })),
      });
      router.push("/owner/menu");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save item.");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/owner/menu"
          className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Add New Item</h1>
          <p className="text-sm text-gray-500 mt-0.5">Add a new item to your menu</p>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-5">
        {/* ── Form (left 60%) ──────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-5">
          {/* Basic info */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Basic Info</h2>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Classic Smash Burger"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Short description of the item…"
                rows={2}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Price ($) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white"
                >
                  <option value="">Select category…</option>
                  {["Starters", "Mains", "Burgers", "Pizza", "Sushi", "Healthy", "Desserts", "Drinks", "Sides"].map((c) => (
                    <option key={c} value={c.toLowerCase()}>{c}</option>
                  ))}
                  <option value="__new__">+ New category</option>
                </select>
                {category === "__new__" && (
                  <input
                    type="text"
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value)}
                    placeholder="Category name"
                    className="mt-2 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Image URL</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/…"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
              />
            </div>
          </div>

          {/* Add-ons */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Add-ons / Extras</h2>
              <button
                onClick={addAddon}
                className="flex items-center gap-1 text-xs font-semibold text-green-600 hover:text-green-700 transition-colors"
              >
                <Plus size={13} /> Add option
              </button>
            </div>

            {addons.length === 0 && (
              <p className="text-xs text-gray-400 py-2">No add-ons yet. Click &ldquo;Add option&rdquo; to create one.</p>
            )}

            {addons.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={row.name}
                  onChange={(e) => updateAddon(i, "name", e.target.value)}
                  placeholder="Option name (e.g. Extra Cheese)"
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                />
                <div className="relative w-24 shrink-0">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.price}
                    onChange={(e) => updateAddon(i, "price", e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-6 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                  />
                </div>
                <button
                  onClick={() => removeAddon(i)}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right column (40%) ──────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Preview card */}
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
                {desc && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{desc}</p>}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-sm font-bold text-gray-800">
                    ${previewPrice > 0 ? previewPrice.toFixed(2) : "0.00"}
                  </span>
                  {isPopular && (
                    <span className="flex items-center gap-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                      <Star size={9} /> Popular
                    </span>
                  )}
                  {isVeg && (
                    <span className="flex items-center gap-0.5 text-[10px] font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                      <Leaf size={9} /> Veg
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Flags</h2>
            {[
              { label: "Available",         sub: "Visible to customers",           val: isAvail,   set: setIsAvail   },
              { label: "Mark as Popular",   sub: "Shown with Popular badge",       val: isPopular, set: setIsPopular },
              { label: "Vegetarian",        sub: "Show the veg leaf icon",         val: isVeg,     set: setIsVeg     },
            ].map(({ label, sub, val, set }) => (
              <div key={label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400">{sub}</p>
                </div>
                <button
                  onClick={() => set(!val)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${val ? "bg-green-500" : "bg-gray-300"}`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${val ? "translate-x-4" : "translate-x-0.5"}`}
                  />
                </button>
              </div>
            ))}
          </div>

          {/* Save button */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition-colors"
            >
              {saving ? "Saving…" : "Save Item"}
            </button>
            <Link
              href="/owner/menu"
              className="w-full py-3 text-center border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-semibold text-sm rounded-xl transition-colors"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
