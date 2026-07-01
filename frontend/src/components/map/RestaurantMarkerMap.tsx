"use client";

import { useEffect, useRef } from "react";
import type { Restaurant } from "@/types/restaurant";
import { formatDistance } from "@/lib/geo";

interface Props {
  restaurants: Restaurant[];
  userLat?: number;
  userLng?: number;
  className?: string;
  onRestaurantClick?: (id: string) => void;
}

export default function RestaurantMarkerMap({
  restaurants,
  userLat,
  userLng,
  className = "h-[500px] w-full rounded-2xl overflow-hidden",
  onRestaurantClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let L: typeof import("leaflet");
    import("leaflet").then((mod) => {
      L = mod.default ?? mod;

      // Fix Leaflet default icon paths broken by bundlers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // Determine initial centre: user location, first restaurant with coords, or NYC fallback

      // Remove leftover Leaflet container id (HMR can leave it on the DOM)
      if (containerRef.current && (containerRef.current as any)._leaflet_id) {
        delete (containerRef.current as any)._leaflet_id;
      }
      const withCoords = restaurants.filter((r) => r.location?.coordinates);
      const centre: [number, number] =
        userLat !== undefined && userLng !== undefined
          ? [userLat, userLng]
          : withCoords.length > 0
          ? [withCoords[0].location!.coordinates[1], withCoords[0].location!.coordinates[0]]
          : [40.7580, -73.9855];

      const map = L.map(containerRef.current!, { zoomControl: true }).setView(centre, 13);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // User location marker (blue pulse circle)
      if (userLat !== undefined && userLng !== undefined) {
        L.circle([userLat, userLng], {
          radius: 80,
          color: "#3b82f6",
          fillColor: "#3b82f6",
          fillOpacity: 0.25,
          weight: 2,
        }).addTo(map);

        L.circleMarker([userLat, userLng], {
          radius: 7,
          color: "#fff",
          fillColor: "#3b82f6",
          fillOpacity: 1,
          weight: 2,
        }).addTo(map).bindPopup("You are here");
      }

      withCoords.forEach((r) => {
        const [lng, lat] = r.location!.coordinates;

        const avatarIcon = L.divIcon({
          className: "",
          html: `
            <div style="position:relative;width:48px;height:56px;cursor:pointer;">
              <div style="
                width:48px;height:48px;border-radius:50%;
                border:3px solid #ff6b35;
                box-shadow:0 2px 10px rgba(0,0,0,0.3);
                overflow:hidden;
                background:#fff;
              ">
                <img
                  src="${r.image}"
                  draggable="false"
                  ondragstart="return false;"
                  style="width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;-webkit-user-drag:none;"
                  onerror="this.style.display='none';this.parentElement.style.background='#ff6b35';this.parentElement.style.display='flex';this.parentElement.style.alignItems='center';this.parentElement.style.justifyContent='center';this.parentElement.innerHTML='<span style=\\'font-size:20px;\\'>🍽️</span>';"
                />
              </div>
              <div style="
                position:absolute;bottom:0;left:50%;transform:translateX(-50%);
                width:0;height:0;
                border-left:6px solid transparent;
                border-right:6px solid transparent;
                border-top:8px solid #ff6b35;
                pointer-events:none;
              "></div>
            </div>`,
          iconSize: [48, 56],
          iconAnchor: [24, 56],
          popupAnchor: [0, -58],
        });

        const distText = r.distance !== undefined ? `<p style="margin:0;font-size:12px;color:#6b7280;">${formatDistance(r.distance)} away</p>` : "";
        const popup = `
          <div style="min-width:180px;font-family:sans-serif;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
              <img src="${r.image}" draggable="false" ondragstart="return false;" style="width:40px;height:40px;border-radius:8px;object-fit:cover;flex-shrink:0;-webkit-user-drag:none;" />
              <div>
                <strong style="font-size:14px;color:#111;display:block;">${r.name}</strong>
                ${distText}
              </div>
            </div>
            <p style="margin:0 0 8px;font-size:12px;color:#6b7280;">${r.deliveryTime} · ${r.deliveryFee === 0 ? "Free delivery" : `$${r.deliveryFee.toFixed(2)} delivery`}</p>
            <a href="/restaurants/${r.id}" style="display:block;text-align:center;padding:6px 12px;background:#ff6b35;color:#fff;border-radius:999px;font-size:12px;font-weight:600;text-decoration:none;">Order now</a>
          </div>
        `;
        const marker = L.marker([lat, lng], { icon: avatarIcon }).addTo(map);
        marker.bindPopup(popup, { maxWidth: 220 });
        if (onRestaurantClick) {
          marker.on("click", () => onRestaurantClick(r.id));
        }
      });

      // Auto-fit bounds when there are multiple restaurants with coords
      if (withCoords.length > 1) {
        const bounds = L.latLngBounds(
          withCoords.map((r) => [r.location!.coordinates[1], r.location!.coordinates[0]] as [number, number])
        );
        if (userLat !== undefined && userLng !== undefined) {
          bounds.extend([userLat, userLng]);
        }
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update user marker when coords change without remounting map
  useEffect(() => {
    // Handled on mount; coordinate changes require remount — managed by key prop in parent
  }, [userLat, userLng]);

  return <div ref={containerRef} className={className} />;
}
