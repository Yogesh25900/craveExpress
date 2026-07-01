"use client";

import { useEffect, useRef } from "react";
import { getToken } from "@/lib/api";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export type OwnerSseEvent =
  | { type: "connected"; restaurantSlug: string }
  | { type: "new_order"; orderId: string; shortId: string; customerName: string; total: number; itemCount: number; placedAt: string }
  | { type: "order_status_changed"; orderId: string; status: string }
  | { type: "ping" };

export function useOwnerSSE(onEvent: (event: OwnerSseEvent) => void): void {
  // Keep the latest callback in a ref so the effect never needs to re-run
  const cbRef = useRef(onEvent);
  useEffect(() => { cbRef.current = onEvent; });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function connect() {
      const token = getToken();
      if (!token || cancelled) return;

      try {
        const res = await fetch(`${BASE}/owner/sse`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          if (!cancelled) setTimeout(connect, 5_000);
          return;
        }

        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer    = "";

        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const evt = JSON.parse(line.slice(6)) as OwnerSseEvent;
                if (evt.type !== "ping") cbRef.current(evt);
              } catch { /* malformed chunk */ }
            }
          }
        }

        if (!cancelled) setTimeout(connect, 3_000);
      } catch {
        if (!cancelled) setTimeout(connect, 5_000);
      }
    }

    connect();
    return () => { cancelled = true; controller.abort(); };
  }, []); // runs once per mount — uses ref for the callback
}
