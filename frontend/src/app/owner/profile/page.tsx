"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Camera, Plus, X, Check, Power, Navigation } from "lucide-react";
import { ownerApi } from "@/lib/api";
import type { PickedLocation } from "@/components/map/LocationPickerMap";

const LocationPickerMap = dynamic(
  () => import("@/components/map/LocationPickerMap"),
  { ssr: false, loading: () => <div className="h-64 w-full rounded-xl bg-gray-100 animate-pulse" /> }
);

const CATEGORIES = ["burgers", "pizza", "sushi", "healthy", "desserts", "drinks", "nepali", "tacos", "other"];
const FALLBACK_BANNER = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=280&fit=crop&q=80";
const FALLBACK_LOGO   = "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=64&h=64&fit=crop&q=80";

const inputCls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500";

function resizeToDataUrl(file: File, maxW: number, maxH: number, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = url;
  });
}

export default function OwnerProfilePage() {
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState("");

  const [name, setName]             = useState("");
  const [address, setAddress]       = useState("");
  const [phone, setPhone]           = useState("");
  const [deliveryFee, setFee]       = useState("");
  const [minOrder, setMin]          = useState("");
  const [deliveryTime, setTime]     = useState("");
  const [deliveryRadius, setRadius] = useState("5");
  const [category, setCategory]     = useState("");
  const [isOpen, setIsOpen]         = useState(true);
  const [tags, setTags]             = useState<string[]>([]);
  const [cuisines, setCuisines]     = useState<string[]>([]);
  const [banner, setBanner]         = useState(FALLBACK_BANNER);
  const [image, setImage]           = useState(FALLBACK_LOGO);
  const [newTag, setNewTag]         = useState("");
  const [newCuisine, setNewCuisine] = useState("");
  const [locationLat, setLocationLat] = useState<number | undefined>(undefined);
  const [locationLng, setLocationLng] = useState<number | undefined>(undefined);
  const [locatingMe, setLocatingMe]   = useState(false);

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ownerApi.getRestaurant()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ restaurant: r }) => {
        const rest = r as Record<string, unknown>;
        setName(String(rest.name ?? ""));
        setAddress(String(rest.address ?? ""));
        setPhone(String(rest.phone ?? ""));
        setFee(String(rest.deliveryFee ?? ""));
        setMin(String(rest.minOrder ?? ""));
        setTime(String(rest.deliveryTime ?? ""));
        setRadius(String(rest.deliveryRadius ?? "5"));
        setCategory(String(rest.category ?? "other"));
        setIsOpen(Boolean(rest.isOpen));
        setTags((rest.tags as string[]) ?? []);
        setCuisines((rest.cuisineTypes as string[]) ?? []);
        if (rest.banner) setBanner(String(rest.banner));
        if (rest.image)  setImage(String(rest.image));
        const loc = rest.location as { coordinates?: [number, number] } | undefined;
        if (loc?.coordinates) {
          setLocationLng(loc.coordinates[0]);
          setLocationLat(loc.coordinates[1]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeToDataUrl(file, 800, 280, 0.78);
    setBanner(dataUrl);
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeToDataUrl(file, 200, 200, 0.85);
    setImage(dataUrl);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        name,
        address,
        phone,
        image,
        banner,
        deliveryFee:    parseFloat(deliveryFee)    || 0,
        minOrder:       parseFloat(minOrder)       || 0,
        deliveryTime,
        deliveryRadius: parseFloat(deliveryRadius) || 5,
        category,
        isOpen,
        tags,
        cuisineTypes: cuisines,
      };
      if (locationLat !== undefined && locationLng !== undefined) {
        payload.location = { type: "Point", coordinates: [locationLng, locationLat] };
      }
      await ownerApi.updateRestaurant(payload as Parameters<typeof ownerApi.updateRestaurant>[0]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally { setSaving(false); }
  }

  function addTag()         { if (newTag.trim()     && !tags.includes(newTag.trim()))     { setTags((t)    => [...t,    newTag.trim()]);     setNewTag("");     } }
  function removeTag(t: string)    { setTags((p)    => p.filter((x) => x !== t)); }
  function addCuisine()     { if (newCuisine.trim() && !cuisines.includes(newCuisine.trim())) { setCuisines((c) => [...c, newCuisine.trim()]); setNewCuisine(""); } }
  function removeCuisine(c: string){ setCuisines((p) => p.filter((x) => x !== c)); }

  function handleLocationPicked(loc: PickedLocation) {
    setLocationLat(loc.lat);
    setLocationLng(loc.lng);
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocatingMe(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationLat(pos.coords.latitude);
        setLocationLng(pos.coords.longitude);
        setLocatingMe(false);
      },
      () => setLocatingMe(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Restaurant Profile</h1>
          <p className="text-sm text-gray-500 mt-0.5">Update your restaurant info visible to customers</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
            saved ? "bg-green-100 text-green-700 border border-green-300"
                  : "bg-green-600 hover:bg-green-700 text-white"
          } disabled:opacity-60`}>
          {saved ? <><Check size={14} /> Saved!</> : saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}

      {/* Banner + logo */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Banner */}
        <div
          className="relative h-32 bg-gray-100 group cursor-pointer"
          onClick={() => bannerInputRef.current?.click()}
        >
          <Image src={banner} alt="Banner" fill className="object-cover" sizes="800px" unoptimized={banner.startsWith("data:")} />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <span className="flex items-center gap-1.5 bg-white/90 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full">
              <Camera size={13} /> Change Banner
            </span>
          </div>
        </div>
        <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />

        <div className="px-5 pb-4 -mt-8 flex items-end gap-4">
          {/* Logo */}
          <div
            className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-white shadow-md bg-gray-100 shrink-0 group cursor-pointer"
            onClick={() => logoInputRef.current?.click()}
          >
            <Image src={image} alt={name} fill className="object-cover" sizes="64px" unoptimized={image.startsWith("data:")} />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <Camera size={14} className="text-white" />
            </div>
          </div>
          <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />

          <div className="pb-1">
            <p className="font-bold text-gray-900">{name || "Your Restaurant"}</p>
            <p className="text-xs text-gray-400">Click image or banner to change</p>
          </div>
        </div>
      </div>

      {/* Basic info */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Basic Info</h2>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Restaurant Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Address</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Cuisine Types</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {cuisines.map((c) => (
              <span key={c} className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full">
                {c}
                <button onClick={() => removeCuisine(c)} className="text-gray-400 hover:text-gray-600 ml-0.5"><X size={11} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={newCuisine} onChange={(e) => setNewCuisine(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCuisine()}
              placeholder="Add cuisine type…"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500" />
            <button onClick={addCuisine} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"><Plus size={14} /></button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tags</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((t) => (
              <span key={t} className="flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2.5 py-1 rounded-full border border-green-200">
                {t}
                <button onClick={() => removeTag(t)} className="text-green-400 hover:text-green-600 ml-0.5"><X size={11} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={newTag} onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTag()}
              placeholder="e.g. family friendly, late night…"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500" />
            <button onClick={addTag} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"><Plus size={14} /></button>
          </div>
        </div>
      </div>

      {/* Status & category */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Status &amp; Category</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">Restaurant Status</p>
            <p className="text-xs text-gray-400">Customers can only order when you&apos;re open</p>
          </div>
          <button onClick={() => setIsOpen((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              isOpen ? "bg-green-100 text-green-700 border border-green-300" : "bg-gray-100 text-gray-500 border border-gray-300"
            }`}>
            <Power size={14} />
            {isOpen ? "Open" : "Closed"}
          </button>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputCls} bg-white capitalize`}>
            {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>
        </div>
      </div>

      {/* Delivery settings */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Delivery Settings</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Delivery Fee ($)</label>
            <input type="number" min="0" step="0.01" value={deliveryFee} onChange={(e) => setFee(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Minimum Order ($)</label>
            <input type="number" min="0" step="0.01" value={minOrder} onChange={(e) => setMin(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Estimated Time</label>
            <input type="text" value={deliveryTime} onChange={(e) => setTime(e.target.value)} placeholder="e.g. 20-30 min" className={inputCls} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Delivery Radius (km)</label>
          <input type="number" min="0.5" max="50" step="0.5" value={deliveryRadius} onChange={(e) => setRadius(e.target.value)} className={inputCls} />
          <p className="text-xs text-gray-400 mt-1">Customers outside this radius won&apos;t see your restaurant.</p>
        </div>
      </div>

      {/* Restaurant location */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Restaurant Location</h2>
            <p className="text-xs text-gray-400 mt-0.5">Customers see this on the map. Click or drag the pin to set it.</p>
          </div>
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locatingMe}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
          >
            <Navigation size={13} />
            {locatingMe ? "Locating…" : "Use my location"}
          </button>
        </div>

        <LocationPickerMap
          key={`${locationLat}-${locationLng}`}
          initialLat={locationLat ?? 40.7580}
          initialLng={locationLng ?? -73.9855}
          onChange={handleLocationPicked}
          className="h-64 w-full rounded-xl overflow-hidden"
        />

        {locationLat !== undefined && locationLng !== undefined && (
          <p className="text-xs text-gray-500">
            📍 {locationLat.toFixed(6)}, {locationLng.toFixed(6)}
          </p>
        )}
      </div>
    </div>
  );
}
