"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Check, X, AlertTriangle, Loader2 } from "lucide-react";
import { ownerApi } from "@/lib/api";

interface MenuCat {
  id:        string;
  name:      string;
  sortOrder: number;
  count:     number;
}

export default function OwnerCategoriesPage() {
  const [categories, setCategories] = useState<MenuCat[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editValue, setEditValue]   = useState("");
  const [saving, setSaving]         = useState(false);

  const [newName, setNewName]       = useState("");
  const [adding, setAdding]         = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting]           = useState(false);

  useEffect(() => { fetchCategories(); }, []);

  async function fetchCategories() {
    try {
      const { categories } = await ownerApi.getCategories();
      setCategories(categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAdding(true);
    setError("");
    try {
      const { category } = await ownerApi.createCategory(trimmed);
      setCategories((prev) => [...prev, category]);
      setNewName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add category.");
    } finally {
      setAdding(false);
    }
  }

  function startEdit(cat: MenuCat) {
    setEditingId(cat.id);
    setEditValue(cat.name);
  }

  async function saveEdit() {
    if (!editValue.trim() || !editingId) return;
    setSaving(true);
    setError("");
    try {
      const { category } = await ownerApi.updateCategory(editingId, editValue.trim());
      setCategories((prev) => prev.map((c) => c.id === editingId ? category : c));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename category.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    setError("");
    try {
      await ownerApi.deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setConfirmDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category.");
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Menu Categories</h1>
        <p className="text-sm text-gray-500 mt-0.5">Organise your menu into sections customers can browse</p>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Add new */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Add New Category</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="e.g. Starters, Desserts, Specials…"
            className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim() || adding}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add
          </button>
        </div>
      </div>

      {/* Category list */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</span>
        </div>

        {categories.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">
            No categories yet — add one above
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {categories.map((cat) => (
            <div key={cat.id} className="px-5 py-3.5">
              {editingId === cat.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    autoFocus
                    className="flex-1 px-3 py-1.5 text-sm border border-green-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  />
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="p-1.5 text-green-600 hover:text-green-700 disabled:opacity-40 transition-colors"
                  >
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
                    <X size={15} />
                  </button>
                </div>
              ) : confirmDelete === cat.id ? (
                <div className="flex items-center gap-3 bg-red-50 rounded-lg px-3 py-2 -mx-1">
                  <AlertTriangle size={14} className="text-red-500 shrink-0" />
                  <p className="text-xs text-red-700 flex-1">
                    {cat.count > 0
                      ? `"${cat.name}" has ${cat.count} active item(s). Move them to another category first.`
                      : `Delete "${cat.name}"?`}
                  </p>
                  {cat.count === 0 && (
                    <button
                      onClick={() => handleDelete(cat.id)}
                      disabled={deleting}
                      className="text-xs font-bold text-red-600 hover:text-red-700 disabled:opacity-40"
                    >
                      {deleting ? "…" : "Delete"}
                    </button>
                  )}
                  <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-500 hover:text-gray-700">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <span className="text-sm font-medium text-gray-800 capitalize">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 font-medium">{cat.count} items</span>
                    <button
                      onClick={() => startEdit(cat)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(cat.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400 px-1">
        Renaming a category also updates all menu items in it. Delete is only allowed when a category has 0 items.
      </p>
    </div>
  );
}
