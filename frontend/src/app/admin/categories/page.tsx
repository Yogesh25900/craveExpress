"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Check, X, AlertTriangle, Loader2 } from "lucide-react";
import { adminApi } from "@/lib/api";

const EMOJI_OPTIONS = ["🍔","🍕","🥗","🍣","🍰","🍛","🥤","🌮","🍜","🍗","🥩","🌯","🥪","☕","🍺"];

interface PlatformCat {
  id:              string;
  slug:            string;
  name:            string;
  emoji:           string;
  sortOrder:       number;
  isActive:        boolean;
  restaurantCount: number;
}

export default function AdminCategoriesPage() {
  const [cats, setCats]           = useState<PlatformCat[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName]   = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const [editSlug, setEditSlug]   = useState("");
  const [saving, setSaving]       = useState(false);

  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [deleting, setDeleting]     = useState(false);

  const [adding, setAdding]       = useState(false);
  const [newName, setNewName]     = useState("");
  const [newEmoji, setNewEmoji]   = useState("🍽️");
  const [newSlug, setNewSlug]     = useState("");
  const [creating, setCreating]   = useState(false);

  useEffect(() => { fetchCats(); }, []);

  async function fetchCats() {
    try {
      const { categories } = await adminApi.categories();
      setCats(categories as PlatformCat[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories.");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(cat: PlatformCat) {
    setEditingId(cat.id); setEditName(cat.name); setEditEmoji(cat.emoji); setEditSlug(cat.slug);
  }

  async function saveEdit() {
    if (!editName.trim() || !editingId) return;
    setSaving(true);
    setError("");
    try {
      const slug = editSlug.trim().toLowerCase() || editName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const { category } = await adminApi.updatePlatformCategory(editingId, { name: editName.trim(), emoji: editEmoji, slug });
      setCats((p) => p.map((c) => c.id === editingId ? { ...c, ...(category as PlatformCat) } : c));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(cat: PlatformCat) {
    try {
      const { category } = await adminApi.updatePlatformCategory(cat.id, { isActive: !cat.isActive });
      setCats((p) => p.map((c) => c.id === cat.id ? { ...c, ...(category as PlatformCat) } : c));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    setError("");
    try {
      await adminApi.deletePlatformCategory(id);
      setCats((p) => p.filter((c) => c.id !== id));
      setConfirmDel(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete.");
      setConfirmDel(null);
    } finally {
      setDeleting(false);
    }
  }

  async function addCategory() {
    if (!newName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const slug = newSlug.trim().toLowerCase() || newName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const { category } = await adminApi.createPlatformCategory({ name: newName.trim(), emoji: newEmoji, slug });
      setCats((p) => [...p, category as PlatformCat]);
      setAdding(false); setNewName(""); setNewEmoji("🍽️"); setNewSlug("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create.");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Food Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">Platform-level categories shown on the browse page</p>
        </div>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors">
          <Plus size={14} /> Add Category
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
      )}

      {/* Add form */}
      {adding && (
        <div className="bg-white rounded-xl border border-orange-200 shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">New Category</h2>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Emoji</label>
              <select value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 bg-white">
                {EMOJI_OPTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Name *</label>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Pasta"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Slug</label>
              <input type="text" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="auto-generated"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addCategory} disabled={!newName.trim() || creating}
              className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors">
              {creating ? <Loader2 size={13} className="animate-spin" /> : null}
              Add
            </button>
            <button onClick={() => { setAdding(false); setNewName(""); setNewEmoji("🍽️"); setNewSlug(""); }}
              className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Category list */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 grid grid-cols-12 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span className="col-span-1">Emoji</span>
          <span className="col-span-4">Name / Slug</span>
          <span className="col-span-2 hidden sm:block">Restaurants</span>
          <span className="col-span-2">Status</span>
          <span className="col-span-3 text-right">Actions</span>
        </div>

        {cats.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No categories yet</div>
        )}

        <div className="divide-y divide-gray-100">
          {cats.map((cat) => (
            <div key={cat.id} className="px-5 py-3.5">
              {editingId === cat.id ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <select value={editEmoji} onChange={(e) => setEditEmoji(e.target.value)}
                    className="w-16 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 bg-white">
                    {EMOJI_OPTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                    className="w-28 px-3 py-1.5 text-sm border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20" autoFocus />
                  <input type="text" value={editSlug} onChange={(e) => setEditSlug(e.target.value)} placeholder="slug"
                    className="w-28 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                  <button onClick={saveEdit} disabled={saving} className="p-1.5 text-green-600 hover:text-green-700 disabled:opacity-40">
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:text-gray-600"><X size={15} /></button>
                </div>
              ) : confirmDel === cat.id ? (
                <div className="flex items-center gap-3 bg-red-50 rounded-lg px-3 py-2 -mx-1">
                  <AlertTriangle size={14} className="text-red-500 shrink-0" />
                  <p className="text-xs text-red-700 flex-1">Delete &ldquo;{cat.name}&rdquo;? This cannot be undone.</p>
                  <button onClick={() => handleDelete(cat.id)} disabled={deleting}
                    className="text-xs font-bold text-red-600 hover:text-red-700 disabled:opacity-40">
                    {deleting ? "…" : "Delete"}
                  </button>
                  <button onClick={() => setConfirmDel(null)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                </div>
              ) : (
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-1 text-xl">{cat.emoji}</span>
                  <div className="col-span-4">
                    <p className="text-sm font-medium text-gray-800">{cat.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{cat.slug}</p>
                  </div>
                  <span className="col-span-2 text-sm text-gray-500 hidden sm:block">{cat.restaurantCount}</span>
                  <div className="col-span-2">
                    <button onClick={() => toggleActive(cat)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${cat.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {cat.isActive ? "Active" : "Hidden"}
                    </button>
                  </div>
                  <div className="col-span-3 flex items-center gap-1.5 justify-end">
                    <button onClick={() => startEdit(cat)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-400 transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setConfirmDel(cat.id)} className="p-1.5 rounded-lg border border-gray-200 hover:border-red-200 hover:text-red-500 text-gray-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
