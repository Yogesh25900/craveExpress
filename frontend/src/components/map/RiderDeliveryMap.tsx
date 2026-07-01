"use client";

import { useEffect, useRef } from "react";

interface Props {
  restaurantLat?: number;
  restaurantLng?: number;
  restaurantName: string;
  restaurantImage: string;
  riderLat?: number;
  riderLng?: number;
  deliveryAddress?: string;
  className?: string;
}

export default function RiderDeliveryMap({
  restaurantLat, restaurantLng, restaurantName, restaurantImage,
  riderLat, riderLng, deliveryAddress, className = "h-64 w-full",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef       = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const riderMarkerRef = useRef<any>(null);

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

      const centre: [number, number] = restaurantLat && restaurantLng
        ? [restaurantLat, restaurantLng]
        : riderLat && riderLng
        ? [riderLat, riderLng]
        : [40.7580, -73.9855];

      const map = L.map(containerRef.current!, { zoomControl: true }).setView(centre, 14);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Restaurant marker (orange avatar)
      if (restaurantLat && restaurantLng) {
        const icon = L.divIcon({
          className: "",
          html: `<div style="position:relative;width:44px;height:52px;">
            <div style="width:44px;height:44px;border-radius:50%;border:3px solid #ff6b35;box-shadow:0 2px 8px rgba(0,0,0,0.3);overflow:hidden;background:#ff6b35;">
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
          .bindPopup(`<strong>${restaurantName}</strong><br/><small>Pickup location</small>`);
      }

      // Rider marker (green bike icon)
      if (riderLat && riderLng) {
        const riderIcon = L.divIcon({
          className: "",
          html: `<div style="width:36px;height:36px;border-radius:50%;background:#16a34a;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:16px;">🛵</div>`,
          iconSize:   [36, 36],
          iconAnchor: [18, 18],
        });
        riderMarkerRef.current = L.marker([riderLat, riderLng], { icon: riderIcon }).addTo(map).bindPopup("Your location");
      }

      // Delivery address label (if no geocoords, show a pulsing marker at an offset)
      if (deliveryAddress) {
        const destIcon = L.divIcon({
          className: "",
          html: `<div style="background:#3b82f6;color:#fff;font-size:11px;font-weight:600;padding:4px 8px;border-radius:999px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.2);">📦 ${deliveryAddress.split(",")[0]}</div>`,
          iconSize: undefined,
          iconAnchor: [50, 10],
        });
        if (restaurantLat && restaurantLng) {
          L.marker([restaurantLat + 0.002, restaurantLng + 0.002], { icon: destIcon }).addTo(map);
        }
      }
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      riderMarkerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update rider marker position when location changes
  useEffect(() => {
    if (!riderMarkerRef.current || !riderLat || !riderLng) return;
    riderMarkerRef.current.setLatLng([riderLat, riderLng]);
    mapRef.current?.panTo([riderLat, riderLng], { animate: true, duration: 0.5 });
  }, [riderLat, riderLng]);

  return <div ref={containerRef} className={className} />;
}
