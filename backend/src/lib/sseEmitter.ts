import type { Response } from "express";

class SseManager {
  // Restaurant/owner channels — keyed by restaurant slug
  private clients: Map<string, Set<Response>> = new Map();

  // Customer order-tracking channels — keyed by orderId
  private orderClients: Map<string, Set<Response>> = new Map();

  // Rider notification channels — keyed by riderId
  private riderClients: Map<string, Set<Response>> = new Map();

  // ── Owner/restaurant channels ────────────────────────────────────────────────

  addClient(slug: string, res: Response): void {
    if (!this.clients.has(slug)) this.clients.set(slug, new Set());
    this.clients.get(slug)!.add(res);
  }

  removeClient(slug: string, res: Response): void {
    this.clients.get(slug)?.delete(res);
  }

  send(slug: string, event: Record<string, unknown>): void {
    this.broadcast(this.clients.get(slug), event);
  }

  sendAll(event: Record<string, unknown>): void {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const clients of this.clients.values()) {
      for (const res of clients) {
        try { res.write(data); } catch { /* ignore */ }
      }
    }
    for (const clients of this.orderClients.values()) {
      for (const res of clients) {
        try { res.write(data); } catch { /* ignore */ }
      }
    }
    for (const clients of this.riderClients.values()) {
      for (const res of clients) {
        try { res.write(data); } catch { /* ignore */ }
      }
    }
  }

  // ── Order tracking channels (customer-facing) ────────────────────────────────

  addOrderClient(orderId: string, res: Response): void {
    if (!this.orderClients.has(orderId)) this.orderClients.set(orderId, new Set());
    this.orderClients.get(orderId)!.add(res);
  }

  removeOrderClient(orderId: string, res: Response): void {
    this.orderClients.get(orderId)?.delete(res);
    if (this.orderClients.get(orderId)?.size === 0) this.orderClients.delete(orderId);
  }

  sendToOrder(orderId: string, event: Record<string, unknown>): void {
    this.broadcast(this.orderClients.get(orderId), event);
  }

  // ── Rider channels ────────────────────────────────────────────────────────────

  addRiderClient(riderId: string, res: Response): void {
    if (!this.riderClients.has(riderId)) this.riderClients.set(riderId, new Set());
    this.riderClients.get(riderId)!.add(res);
  }

  removeRiderClient(riderId: string, res: Response): void {
    this.riderClients.get(riderId)?.delete(res);
    if (this.riderClients.get(riderId)?.size === 0) this.riderClients.delete(riderId);
  }

  sendToRider(riderId: string, event: Record<string, unknown>): void {
    this.broadcast(this.riderClients.get(riderId), event);
  }

  broadcastToAllRiders(event: Record<string, unknown>): void {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const clients of this.riderClients.values()) {
      for (const res of clients) {
        try { res.write(data); } catch { /* disconnected */ }
      }
    }
  }

  // ── Internal ──────────────────────────────────────────────────────────────────

  private broadcast(clients: Set<Response> | undefined, event: Record<string, unknown>): void {
    if (!clients?.size) return;
    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const res of clients) {
      try { res.write(data); } catch { /* client disconnected */ }
    }
  }
}

export const sseManager = new SseManager();

// Keep alive — browsers drop SSE after ~30s of silence
setInterval(() => sseManager.sendAll({ type: "ping" }), 25_000);
