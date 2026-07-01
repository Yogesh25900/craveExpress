"use client";

import { useEffect, useRef, useCallback } from "react";

export interface PickedLocation {
  lat: number;
  lng: number;
}

interface Props {
  initialLat?: number;
  initialLng?: number;
  onChange: (loc: PickedLocation) => void;
  className?: string;
}

export default function LocationPickerMap({
  initialLat = 40.7580,
  initialLng = -73.9855,
  onChange,
  className = "h-64 w-full rounded-xl overflow-hidden",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef    = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const moveTo = useCallback((lat: number, lng: number) => {
    if (!markerRef.current) return;
    markerRef.current.setLatLng([lat, lng]);
    onChangeRef.current({ lat, lng });
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    import("leaflet").then((mod) => {
      const L = mod.default ?? mod;

      // In dev with HMR the DOM container can keep a leftover Leaflet id
      // which causes `Map container is already initialized.` errors when
      // re-creating the map. Remove it if present so L.map can proceed.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (containerRef.current && (containerRef.current as any)._leaflet_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (containerRef.current as any)._leaflet_id;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current!, { zoomControl: true }).setView([initialLat, initialLng], 15);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:36px;height:36px;border-radius:50%;
          background:#ff6b35;border:3px solid #fff;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);
          display:flex;align-items:center;justify-content:center;
          font-size:16px;
        ">📍</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -38],
      });

      const marker = L.marker([initialLat, initialLng], { icon, draggable: true }).addTo(map);
      markerRef.current = marker;
      marker.bindPopup("Drag to set your location").openPopup();

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onChangeRef.current({ lat: pos.lat, lng: pos.lng });
      });

      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        marker.setLatLng([e.latlng.lat, e.latlng.lng]);
        onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      // Expose moveTo for parent usage
      (containerRef.current as HTMLDivElement & { moveTo?: (lat: number, lng: number) => void }).moveTo = moveTo;
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative">
      <div ref={containerRef} className={className} />
      <p className="text-xs text-gray-400 mt-1.5 text-center">Click on the map or drag the pin to set location</p>
    </div>
  );
}
