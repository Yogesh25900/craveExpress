"use client";

import { useEffect, useRef, useCallback } from "react";
import { getToken } from "@/lib/api";

interface OrderSSEEvent {
  type: string;
  status?: string;
  lat?: number;
  lng?: number;
  at?: string;
  riderName?: string;
  riderPhone?: string;
  riderId?: string;
}

interface UseOrderSSEOptions {
  onStatusChange?: (status: string, at: string) => void;
  onRiderLocation?: (lat: number, lng: number) => void;
  onRiderAssigned?: (name: string, phone: string) => void;
}

export function useOrderSSE(orderId: string | undefined, opts: UseOrderSSEOptions) {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const esRef          = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (!orderId) return;
    const token = getToken();
    if (!token) return;

    const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
    // EventSource doesn't support custom headers; pass token as query param
    const url = `${BASE}/orders/${orderId}/sse?token=${encodeURIComponent(token)}`;

    esRef.current?.close();
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data as string) as OrderSSEEvent;
        if (event.type === "order_status_changed" && event.status) {
          optsRef.current.onStatusChange?.(event.status, event.at ?? new Date().toISOString());
        }
        if (event.type === "rider_location" && event.lat != null && event.lng != null) {
          optsRef.current.onRiderLocation?.(event.lat, event.lng);
        }
        if (event.type === "rider_assigned" && event.riderName) {
          optsRef.current.onRiderAssigned?.(event.riderName, event.riderPhone ?? "");
        }
      } catch { /* ignore malformed */ }
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
      reconnectTimer.current = setTimeout(connect, 5000);
    };
  }, [orderId]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [connect]);
}
