"use client";

import { useState, useCallback } from "react";

export interface GeoCoords {
  lat: number;
  lng: number;
}

type Status = "idle" | "requesting" | "granted" | "denied" | "unavailable";

export function useGeolocation() {
  const [coords, setCoords] = useState<GeoCoords | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    setStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("granted");
      },
      () => {
        setStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  return { coords, status, request };
}
