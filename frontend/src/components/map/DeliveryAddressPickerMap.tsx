"use client";

import { useEffect, useRef } from "react";

export interface DeliveryLocation {
  lat: number;
  lng: number;
  displayName?: string;
}

interface Props {
  initialLat?: number;
  initialLng?: number;
  onChange: (loc: DeliveryLocation) => void;
  className?: string;
}

export default function DeliveryAddressPickerMap({
  initialLat = 40.7580,
  initialLng = -73.9855,
  onChange,
  className = "h-52 w-full rounded-xl overflow-hidden",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef    = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { "Accept-Language": "en" } }
      );
      const j = (await r.json()) as { display_name?: string };
      return j.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    import("leaflet").then((mod) => {
      const L = mod.default ?? mod;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current!, {
        zoomControl: true,
        scrollWheelZoom: false,
      }).setView([initialLat, initialLng], 15);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:36px;height:36px;border-radius:50%;
          background:#3b82f6;border:3px solid #fff;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);
          display:flex;align-items:center;justify-content:center;
          font-size:16px;
        ">🏠</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -38],
      });

      const marker = L.marker([initialLat, initialLng], { icon, draggable: true }).addTo(map);
      markerRef.current = marker;
      marker.bindPopup("Your delivery location").openPopup();

      async function handleMove(lat: number, lng: number) {
        const displayName = await reverseGeocode(lat, lng);
        onChangeRef.current({ lat, lng, displayName });
        marker.bindPopup(`<strong>Deliver here</strong><br/><small>${displayName.split(",").slice(0, 3).join(",")}</small>`).openPopup();
      }

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        handleMove(pos.lat, pos.lng);
      });

      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        marker.setLatLng([e.latlng.lat, e.latlng.lng]);
        handleMove(e.latlng.lat, e.latlng.lng);
      });
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div ref={containerRef} className={className} />
      <p className="text-xs text-gray-400 mt-1.5 text-center">Click or drag to set your exact delivery location</p>
    </div>
  );
}
