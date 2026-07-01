"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Check, AlertTriangle } from "lucide-react";
import { adminApi } from "@/lib/api";

interface Coupon {
  _id: string;
  code: string;
  type: "percent" | "flat";
  value: number;
  minOrder: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  isActive: boolean;
  description: string;
}

type CouponForm = Omit<Coupon, "_id">;

function fmtDate(iso: string) {
  const d = new Date(iso);
  const isPast = d < new Date();
  return { text: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), isPast };
}

const BLANK: CouponForm = {
  code: "", type: "percent", value: 10, minOrder: 0, maxUses: 0, usedCount: 0,
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  isActive: true, description: "",
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons]   = useState<Coupon[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [editing, setEditing]   = useState<Coupon | null>(null);
  const [adding, setAdding]     = useState(false);
  const [form, setForm]         = useState<CouponForm>(BLANK);
  const [confirmDel, setDel]    = useState<string | null>(null);
  const [formError, setFormErr] = useState("");
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    adminApi.coupons()
      .then((res) => setCoupons((res.coupons as Coupon[]) ?? []))
      .catch(() => setError("Failed to load coupons"))
      .finally(() => setLoading(false));
  }, []);

  function openAdd()  { setForm(BLANK); setAdding(true); setEditing(null); setFormErr(""); }
  function openEdit(c: Coupon) { setForm({ ...c }); setEditing(c); setAdding(false); setFormErr(""); }
  function closeForm() { setAdding(false); setEditing(null); setFormErr(""); }

  async function saveForm() {
    if (!form.code.trim()) return setFormErr("Code is required.");
    if (form.value <= 0)   return setFormErr("Value must be > 0.");
    setSaving(true);
    setFormErr("");
    try {
      const payload = { ...form, code: form.code.trim().toUpperCase() };
      if (adding) {
        const res = await adminApi.createCoupon(payload);
        setCoupons((p) => [res.coupon as Coupon, ...p]);
      } else if (editing) {
        const res = await adminApi.updateCoupon(editing._id, payload);
        setCoupons((p) => p.map((c) => c._id === editing._id ? res.coupon as Coupon : c));
      }
      closeForm();
    } catch (e) {
      setFormErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: Coupon) {
    try {
      const res = await adminApi.updateCoupon(c._id, { isActive: !c.isActive });
      setCoupons((p) => p.map((x) => x._id === c._id ? res.coupon as Coupon : x));
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function deleteConfirmed(id: string) {
    try {
      await adminApi.deleteCoupon(id);
      setCoupons((p) => p.filter((c) => c._id !== id));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setDel(null);
    }
  }

  const formOpen = adding || editing !== null;

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Coupons &amp; Promotions</h1>
          <p className="text-sm text-gray-500 mt-0.5">{coupons.length} promo codes</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors">
          <Plus size={14} /> New Coupon
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>}

      {formOpen && (
        <div className="bg-white rounded-xl border border-orange-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">{adding ? "New Coupon" : "Edit Coupon"}</h2>
            <button onClick={closeForm} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          {formError && <p className="text-xs text-red-500">{formError}</p>}

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Code *</label>
              <input type="text" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. SAVE20" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 font-mono uppercase" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as Coupon["type"] }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 bg-white">
                <option value="percent">Percentage (%)</option>
                <option value="flat">Flat ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Value * {form.type === "percent" ? "(%)" : "($)"}</label>
              <input type="number" min="0" step="1" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: +e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Min Order ($)</label>
              <input type="number" min="0" step="1" value={form.minOrder} onChange={(e) => setForm((f) => ({ ...f, minOrder: +e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Max Uses (0 = unlimited)</label>
              <input type="number" min="0" step="1" value={form.maxUses} onChange={(e) => setForm((f) => ({ ...f, maxUses: +e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Expires</label>
              <input type="date" value={typeof form.expiresAt === "string" ? form.expiresAt.slice(0, 10) : ""}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: new Date(e.target.value).toISOString() }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
            <input type="text" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Internal note about this coupon"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                className={`relative w-9 h-5 rounded-full transition-colors ${form.isActive ? "bg-orange-500" : "bg-gray-300"}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isActive ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
              <span className="text-xs text-gray-600 font-medium">{form.isActive ? "Active" : "Inactive"}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={closeForm} className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={saveForm} disabled={saving} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-60">
                <Check size={13} /> {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                <th className="px-5 py-3 text-left">Code</th>
                <th className="px-3 py-3 text-left">Discount</th>
                <th className="px-3 py-3 text-left hidden sm:table-cell">Min Order</th>
                <th className="px-3 py-3 text-left hidden md:table-cell">Usage</th>
                <th className="px-3 py-3 text-left hidden lg:table-cell">Expires</th>
                <th className="px-3 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {coupons.map((c) => {
                const exp = fmtDate(c.expiresAt);
                return (
                  <tr key={c._id} className={`hover:bg-gray-50 transition-colors ${!c.isActive ? "opacity-60" : ""}`}>
                    {confirmDel === c._id ? (
                      <td colSpan={7} className="px-5 py-3">
                        <div className="flex items-center gap-3 bg-red-50 rounded-lg px-3 py-2">
                          <AlertTriangle size={14} className="text-red-500" />
                          <p className="text-xs text-red-700 flex-1">Delete coupon <strong>{c.code}</strong>?</p>
                          <button onClick={() => deleteConfirmed(c._id)} className="text-xs font-bold text-red-600">Delete</button>
                          <button onClick={() => setDel(null)} className="text-xs text-gray-500">Cancel</button>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="px-5 py-3.5">
                          <span className="font-mono font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">{c.code}</span>
                          {c.description && <p className="text-xs text-gray-400 mt-0.5">{c.description}</p>}
                        </td>
                        <td className="px-3 py-3.5 font-semibold text-gray-800">
                          {c.type === "percent" ? `${c.value}% off` : `$${c.value} off`}
                        </td>
                        <td className="px-3 py-3.5 text-gray-500 text-xs hidden sm:table-cell">
                          {c.minOrder > 0 ? `$${c.minOrder}` : "None"}
                        </td>
                        <td className="px-3 py-3.5 hidden md:table-cell">
                          <span className="text-xs text-gray-600">
                            {c.usedCount} / {c.maxUses === 0 ? "∞" : c.maxUses}
                          </span>
                          {c.maxUses > 0 && (
                            <div className="w-16 bg-gray-100 rounded-full h-1 mt-1">
                              <div className="h-1 rounded-full bg-orange-400" style={{ width: `${Math.min((c.usedCount / c.maxUses) * 100, 100)}%` }} />
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3.5 text-xs hidden lg:table-cell">
                          <span className={exp.isPast ? "text-red-500 font-medium" : "text-gray-500"}>{exp.text}</span>
                        </td>
                        <td className="px-3 py-3.5">
                          <button onClick={() => toggleActive(c)}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {c.isActive ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 justify-end">
                            <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-400 transition-colors"><Pencil size={13} /></button>
                            <button onClick={() => setDel(c._id)} className="p-1.5 rounded-lg border border-gray-200 hover:border-red-200 hover:text-red-500 text-gray-400 transition-colors"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {coupons.length === 0 && <div className="py-12 text-center text-sm text-gray-400">No coupons yet</div>}
      </div>
    </div>
  );
}
