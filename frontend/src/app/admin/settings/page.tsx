"use client";

import { useEffect, useState } from "react";
import { Save, Check, AlertTriangle } from "lucide-react";
import { adminApi } from "@/lib/api";

interface Settings {
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  defaultDeliveryFee: number;
  defaultMinOrder: number;
  commissionRate: number;
  maintenanceMode: boolean;
  allowGuestCheckout: boolean;
  maxDeliveryRadius: number;
}

const DEFAULTS: Settings = {
  platformName: "CraveExpress", supportEmail: "support@craveexpress.com",
  supportPhone: "+1 (800) 555-CRAVE", defaultDeliveryFee: 2.99,
  defaultMinOrder: 10, commissionRate: 15, maintenanceMode: false,
  allowGuestCheckout: true, maxDeliveryRadius: 10,
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 pt-1">{children}</h2>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
      <div className="sm:w-56 shrink-0">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`relative rounded-full transition-colors ${value ? "bg-orange-500" : "bg-gray-300"}`}
      style={{ height: "22px", width: "40px" }}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>({ ...DEFAULTS });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => {
    adminApi.settings()
      .then((res) => {
        const s = res.settings as Settings;
        if (s) setSettings({ ...DEFAULTS, ...s });
      })
      .catch(() => setError("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  function set<K extends keyof Settings>(key: K, val: Settings[K]) {
    setSettings((s) => ({ ...s, [key]: val }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await adminApi.updateSettings(settings);
      setSettings({ ...DEFAULTS, ...(res.settings as Settings) });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400";

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Platform Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure global platform behavior</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 ${saved ? "bg-green-500 text-white" : "bg-orange-500 hover:bg-orange-600 text-white"}`}>
          {saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> {saving ? "Saving…" : "Save Changes"}</>}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <SectionTitle>General</SectionTitle>
        <Field label="Platform Name" hint="Shown in emails and receipts">
          <input type="text" value={settings.platformName} onChange={(e) => set("platformName", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Support Email" hint="Customers contact this address">
          <input type="email" value={settings.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Support Phone">
          <input type="tel" value={settings.supportPhone} onChange={(e) => set("supportPhone", e.target.value)} className={inputClass} />
        </Field>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <SectionTitle>Delivery &amp; Ordering</SectionTitle>
        <Field label="Default Delivery Fee ($)" hint="Used when restaurant hasn't set one">
          <input type="number" min="0" step="0.5" value={settings.defaultDeliveryFee}
            onChange={(e) => set("defaultDeliveryFee", +e.target.value)} className={inputClass} />
        </Field>
        <Field label="Default Min Order ($)" hint="Minimum basket size platform-wide">
          <input type="number" min="0" step="1" value={settings.defaultMinOrder}
            onChange={(e) => set("defaultMinOrder", +e.target.value)} className={inputClass} />
        </Field>
        <Field label="Max Delivery Radius (km)" hint="Maximum radius restaurants can serve">
          <input type="number" min="1" step="1" value={settings.maxDeliveryRadius}
            onChange={(e) => set("maxDeliveryRadius", +e.target.value)} className={inputClass} />
        </Field>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <SectionTitle>Revenue</SectionTitle>
        <Field label="Platform Commission (%)" hint="Percentage taken from each order">
          <input type="number" min="0" max="100" step="0.5" value={settings.commissionRate}
            onChange={(e) => set("commissionRate", +e.target.value)} className={inputClass} />
        </Field>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <SectionTitle>Feature Flags</SectionTitle>
        <Field label="Guest Checkout" hint="Allow orders without an account">
          <div className="flex items-center gap-3 mt-1">
            <Toggle value={settings.allowGuestCheckout} onChange={(v) => set("allowGuestCheckout", v)} />
            <span className="text-xs text-gray-500">{settings.allowGuestCheckout ? "Enabled" : "Disabled"}</span>
          </div>
        </Field>
      </div>

      <div className={`bg-white rounded-xl border shadow-sm p-5 space-y-4 ${settings.maintenanceMode ? "border-red-200" : "border-gray-200"}`}>
        <SectionTitle>Maintenance</SectionTitle>
        {settings.maintenanceMode && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            <AlertTriangle size={14} className="text-red-500 shrink-0" />
            <p className="text-xs text-red-600 font-medium">Platform is currently in maintenance mode. Customers cannot place orders.</p>
          </div>
        )}
        <Field label="Maintenance Mode" hint="Temporarily disable the platform for all users">
          <div className="flex items-center gap-3 mt-1">
            <Toggle value={settings.maintenanceMode} onChange={(v) => set("maintenanceMode", v)} />
            <span className={`text-xs font-semibold ${settings.maintenanceMode ? "text-red-500" : "text-gray-500"}`}>
              {settings.maintenanceMode ? "ON — Site unavailable" : "Off"}
            </span>
          </div>
        </Field>
      </div>
    </div>
  );
}
