"use client";

import { useEffect, useRef } from "react";

interface Props {
  restaurantLat?: number;
  restaurantLng?: number;
  restaurantName: string;
  restaurantImage: string;
  riderLat?: number;
  riderLng?: number;
  riderName?: string;
  className?: string;
}

export default function OrderTrackingMap({
  restaurantLat, restaurantLng, restaurantName, restaurantImage,
  riderLat, riderLng, riderName, className = "h-56 w-full",
}: Props) {
  const containerRef   = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef         = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const riderMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polylineRef    = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let L: any;
    import("leaflet").then((mod) => {
      L = mod.default ?? mod;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((containerRef.current as any)._leaflet_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (containerRef.current as any)._leaflet_id;
      }

      const centre: [number, number] =
        restaurantLat && restaurantLng ? [restaurantLat, restaurantLng]
        : riderLat && riderLng        ? [riderLat, riderLng]
        : [40.7580, -73.9855];

      const map = L.map(containerRef.current!, { zoomControl: true, scrollWheelZoom: false }).setView(centre, 14);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Restaurant marker (orange)
      if (restaurantLat && restaurantLng) {
        const icon = L.divIcon({
          className: "",
          html: `<div style="position:relative;width:44px;height:52px;">
            <div style="width:44px;height:44px;border-radius:50%;border:3px solid #ff6b35;box-shadow:0 2px 10px rgba(0,0,0,0.3);overflow:hidden;background:#ff6b35;">
              <img src="${restaurantImage}" draggable="false" ondragstart="return false;"
                style="width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;-webkit-user-drag:none;"
                onerror="this.style.display='none';" />
            </div>
            <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid #ff6b35;pointer-events:none;"></div>
          </div>`,
          iconSize: [44, 52],
          iconAnchor: [22, 52],
          popupAnchor: [0, -54],
        });
        L.marker([restaurantLat, restaurantLng], { icon })
          .addTo(map)
          .bindPopup(`<strong>${restaurantName}</strong><br/><small>Restaurant</small>`);
      }

      // Rider marker (green scooter) — only if rider location is known
      if (riderLat && riderLng) {
        const riderIcon = L.divIcon({
          className: "",
          html: `<div style="width:40px;height:40px;border-radius:50%;background:#16a34a;border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:18px;">🛵</div>`,
          iconSize:   [40, 40],
          iconAnchor: [20, 20],
        });
        riderMarkerRef.current = L.marker([riderLat, riderLng], { icon: riderIcon, zIndexOffset: 1000 })
          .addTo(map)
          .bindPopup(`<strong>${riderName ?? "Delivery Partner"}</strong><br/><small>On the way to you</small>`);
      }

      // Fit bounds to show both restaurant and rider
      const points: [number, number][] = [];
      if (restaurantLat && restaurantLng) points.push([restaurantLat, restaurantLng]);
      if (riderLat && riderLng) points.push([riderLat, riderLng]);
      if (points.length > 1) {
        map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
      }
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      riderMarkerRef.current = null;
      polylineRef.current    = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Smoothly update rider marker on location change
  useEffect(() => {
    if (!riderMarkerRef.current || !riderLat || !riderLng) return;
    riderMarkerRef.current.setLatLng([riderLat, riderLng]);

    // Fit to show both restaurant + rider
    if (mapRef.current) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const L = (window as any).L;
        if (L && restaurantLat && restaurantLng) {
          import("leaflet").then((mod) => {
            const Lf = mod.default ?? mod;
            const bounds = Lf.latLngBounds([[riderLat, riderLng], [restaurantLat!, restaurantLng!]]);
            mapRef.current.fitBounds(bounds, { padding: [40, 40], animate: true, duration: 0.8 });
          });
        } else {
          mapRef.current.panTo([riderLat, riderLng], { animate: true, duration: 0.8 });
        }
      } catch { /* ignore */ }
    }
  }, [riderLat, riderLng, restaurantLat, restaurantLng]);

  return <div ref={containerRef} className={className} />;
}
