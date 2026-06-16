/**
 * Typed API client for CraveExpress backend.
 * All functions throw an Error with a human-readable message on failure.
 */

import type { User, LoginCredentials, SignupData } from "@/types/auth";

// ── Config ─────────────────────────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

// Absolute URL the browser navigates to (top-level redirect) to start Google SSO.
export const GOOGLE_OAUTH_URL = `${BASE}/auth/oauth/google`;

export const TOKEN_KEY      = "ce_token";
export const REFRESH_KEY    = "ce_refresh_token";
export const CSRF_TOKEN_KEY = "ce_csrf_token";

// ── Token helpers ──────────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken?: string): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(CSRF_TOKEN_KEY);
}

// ── CSRF token helpers ─────────────────────────────────────────────────────────

function getCsrfToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CSRF_TOKEN_KEY);
}

export function storeCsrfToken(token: string): void {
  if (typeof window !== "undefined") localStorage.setItem(CSRF_TOKEN_KEY, token);
}

// ── Core fetch wrapper ─────────────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts: { auth?: boolean } = {}
): Promise<T> {
  const { auth = true } = opts;
  const headers: Record<string, string> = {};

  if (body) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  // Send the CSRF token on every request — the backend only enforces it on /refresh and /logout
  const csrfToken = getCsrfToken();
  if (csrfToken) headers["X-CSRF-Token"] = csrfToken;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: "include",
    ...(body != null ? { body: JSON.stringify(body) } : {}),
  });

  type ApiResponse = { success: boolean; data?: T; message?: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let json: ApiResponse | null = null;
  try {
    json = (await res.json()) as ApiResponse;
  } catch (_) {
    // 204 No Content or empty body — json stays null
  }

  if (!res.ok || !json?.success) {
    throw new Error((json as ApiResponse | null)?.message ?? `Request failed (${res.status})`);
  }

  // Transparently capture any CSRF token the server includes in the response
  const data = (json as ApiResponse).data;
  if (data && typeof data === "object" && "csrfToken" in (data as object)) {
    const incoming = (data as Record<string, unknown>)["csrfToken"];
    if (typeof incoming === "string") storeCsrfToken(incoming);
  }

  return data as T;
}

const get    = <T>(path: string, auth = true)                => request<T>("GET",    path, undefined, { auth });
const post   = <T>(path: string, body?: unknown, auth = true) => request<T>("POST",   path, body,      { auth });
const put    = <T>(path: string, body?: unknown)              => request<T>("PUT",    path, body);
const patch  = <T>(path: string, body?: unknown)              => request<T>("PATCH",  path, body);
const del    = <T>(path: string)                              => request<T>("DELETE", path);

function qs(params: Record<string, string | number | undefined | null>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

// ── Auth API ───────────────────────────────────────────────────────────────────

export const authApi = {
  login: (credentials: LoginCredentials) =>
    post<{ user: User; accessToken: string; refreshToken: string }>("/auth/login", credentials, false),

  signup: (data: Omit<SignupData, "confirmPassword">) =>
    post<{ user: User; accessToken: string; refreshToken: string }>("/auth/signup", data, false),

  logout: () => post<void>("/auth/logout"),

  me: () => get<{ user: User }>("/auth/me"),

  refresh: (refreshToken: string) =>
    post<{ accessToken: string; refreshToken: string }>("/auth/refresh", { refreshToken }, false),

  updateMe: (data: { fullName?: string; phone?: string; avatar?: string }) =>
    put<{ user: User }>("/auth/me", data),

  addAddress: (addr: { label?: string; street: string; city: string; zip: string }) =>
    post<{ user: User }>("/auth/me/addresses", addr),

  removeAddress: (addressId: string) =>
    del<{ user: User }>(`/auth/me/addresses/${addressId}`),

  forgotPassword: (email: string) =>
    post<{ message: string }>("/auth/forgot-password", { email }, false),

  changePassword: (currentPassword: string, newPassword: string) =>
    post<{ message: string }>("/auth/me/change-password", { currentPassword, newPassword }),

  mfaEnroll: () =>
    post<{ qrDataUrl: string; secret: string }>("/auth/me/mfa/enroll"),

  mfaVerifyEnroll: (code: string) =>
    post<{ recoveryCodes: string[] }>("/auth/me/mfa/verify-enroll", { code }),

  mfaDisable: (password: string, code: string) =>
    post<{ message: string }>("/auth/me/mfa/disable", { password, code }),

  mfaVerifyLogin: (mfaToken: string, code: string, isRecoveryCode = false) =>
    post<{ user: User; accessToken: string; refreshToken: string }>(
      "/auth/mfa/verify-login", { mfaToken, code, isRecoveryCode }, false
    ),

  exportMyData: async (): Promise<void> => {
    const token = getToken();
    const csrfToken = getCsrfToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (csrfToken) headers["X-CSRF-Token"] = csrfToken;

    const res = await fetch(`${BASE}/auth/me/export`, {
      method: "GET",
      headers,
      credentials: "include",
    });

    if (!res.ok) {
      let msg = `Export failed (${res.status})`;
      try { const j = await res.json(); msg = j?.message ?? msg; } catch { /* empty body */ }
      throw new Error(msg);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-craveexpress-data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

// ── Platform categories API ────────────────────────────────────────────────────

export const categoryApi = {
  list: () =>
    get<{ categories: { id: string; slug: string; name: string; emoji: string }[] }>("/categories", false),
};

// ── Restaurant API ─────────────────────────────────────────────────────────────

export const restaurantApi = {
  list: (params?: { category?: string; search?: string; sort?: string; lat?: number; lng?: number; radius?: number }) =>
    get<{ restaurants: unknown[] }>(`/restaurants${qs(params ?? {})}`, false),

  get: (slug: string) =>
    get<{ restaurant: unknown }>(`/restaurants/${slug}`, false),

  menu: (slug: string) =>
    get<{ categories: unknown[]; items: unknown[] }>(`/restaurants/${slug}/menu`, false),

  reviews: (slug: string) =>
    get<{ reviews: unknown[] }>(`/restaurants/${slug}/reviews`, false),

  postReview: (slug: string, data: { rating: number; comment: string }) =>
    post<{ review: unknown }>(`/restaurants/${slug}/reviews`, data),
};

// ── Orders API ─────────────────────────────────────────────────────────────────

export const orderApi = {
  place: (data: unknown) =>
    post<{ order: unknown }>("/orders", data),

  list: () =>
    get<{ orders: unknown[] }>("/orders"),

  get: (id: string) =>
    get<{ order: unknown }>(`/orders/${id}`),

  cancel: (id: string) =>
    patch<{ order: unknown }>(`/orders/${id}/cancel`),

  validateCoupon: (code: string, orderTotal: number) =>
    post<{ valid: boolean; discount: number; coupon: unknown }>(
      "/orders/coupons/validate", { code, orderTotal }
    ),
};

// ── Payment API (eSewa) ────────────────────────────────────────────────────────

export const paymentApi = {
  // Returns the signed hidden-form fields + action URL to POST to eSewa.
  initiateEsewa: (orderId: string) =>
    post<{ action: string; fields: Record<string, string | number> }>(
      "/payments/esewa/initiate", { orderId }
    ),
};

// Build and auto-submit a hidden form to eSewa's hosted payment page.
// A top-level form POST is required so eSewa can redirect the browser back to us.
export function submitEsewaForm(action: string, fields: Record<string, string | number>): void {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = String(value);
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

// ── Owner API ──────────────────────────────────────────────────────────────────

export const ownerApi = {
  getRestaurant: () =>
    get<{ restaurant: unknown }>("/owner/restaurant"),

  updateRestaurant: (data: unknown) =>
    put<{ restaurant: unknown }>("/owner/restaurant", data),

  getCategories: () =>
    get<{ categories: { id: string; name: string; sortOrder: number; count: number }[] }>("/owner/categories"),

  createCategory: (name: string) =>
    post<{ category: { id: string; name: string; sortOrder: number; count: number } }>("/owner/categories", { name }),

  updateCategory: (id: string, name: string) =>
    put<{ category: { id: string; name: string; sortOrder: number; count: number } }>(`/owner/categories/${id}`, { name }),

  deleteCategory: (id: string) =>
    del<{ message: string }>(`/owner/categories/${id}`),

  getMenu: () =>
    get<{ items: unknown[] }>("/owner/menu"),

  createMenuItem: (data: unknown) =>
    post<{ item: unknown }>("/owner/menu", data),

  updateMenuItem: (id: string, data: unknown) =>
    put<{ item: unknown }>(`/owner/menu/${id}`, data),

  deleteMenuItem: (id: string) =>
    del<{ message: string }>(`/owner/menu/${id}`),

  getOrders: (params?: { status?: string; page?: number; limit?: number }) =>
    get<{ orders: unknown[]; total: number }>(`/owner/orders${qs(params ?? {})}`),

  getOrder: (id: string) =>
    get<{ order: unknown }>(`/owner/orders/${id}`),

  updateOrderStatus: (id: string, status: string) =>
    patch<{ order: unknown }>(`/owner/orders/${id}/status`, { status }),

  getAnalytics: (days = 30) =>
    get<{ daily: unknown[]; totals: unknown; topItems: unknown[] }>(`/owner/analytics?days=${days}`),
};

// ── Rider API ─────────────────────────────────────────────────────────────────

export const riderApi = {
  availableOrders: () =>
    get<{ orders: unknown[] }>("/rider/orders/available"),

  activeOrder: () =>
    get<{ order: unknown }>("/rider/orders/active"),

  history: (params?: { page?: number; limit?: number }) =>
    get<{ orders: unknown[]; total: number }>(`/rider/orders/history${qs(params ?? {})}`),

  getOrder: (id: string) =>
    get<{ order: unknown }>(`/rider/orders/${id}`),

  setAvailability: (isOnline: boolean) =>
    patch<{ isOnline: boolean }>("/rider/availability", { isOnline }),

  acceptOrder: (id: string) =>
    patch<{ order: unknown }>(`/rider/orders/${id}/accept`),

  rejectOrder: (id: string) =>
    patch<{ order: unknown }>(`/rider/orders/${id}/reject`),

  updateStatus: (id: string, status: "picked_up" | "out_for_delivery" | "delivered") =>
    patch<{ order: unknown }>(`/rider/orders/${id}/status`, { status }),

  updateLocation: (orderId: string, lat: number, lng: number) =>
    post<{ lat: number; lng: number }>("/rider/location", { orderId, lat, lng }),

  earnings: () =>
    get<{ today: unknown; week: unknown; month: unknown; allTime: unknown; daily: unknown[] }>("/rider/earnings"),
};

// ── Admin API ──────────────────────────────────────────────────────────────────

export const adminApi = {
  stats: () =>
    get<{ stats: unknown }>("/admin/stats"),

  analytics: (days = 30) =>
    get<{ analytics: unknown[]; topRestaurants: unknown[] }>(`/admin/analytics?days=${days}`),

  orders: (params?: Record<string, string | number>) =>
    get<{ orders: unknown[]; total: number }>(`/admin/orders${qs(params ?? {})}`),

  getOrder: (id: string) =>
    get<{ order: unknown }>(`/admin/orders/${id}`),

  updateOrderStatus: (id: string, status: string) =>
    put<{ order: unknown }>(`/admin/orders/${id}/status`, { status }),

  transactions: (params?: Record<string, string | number>) =>
    get<{ transactions: unknown[]; total: number }>(`/admin/transactions${qs(params ?? {})}`),

  restaurants: () =>
    get<{ restaurants: unknown[] }>("/admin/restaurants"),

  createRestaurant: (data: unknown) =>
    post<{ restaurant: unknown }>("/admin/restaurants", data),

  updateRestaurant: (id: string, data: unknown) =>
    put<{ restaurant: unknown }>(`/admin/restaurants/${id}`, data),

  deleteRestaurant: (id: string) =>
    del<{ message: string }>(`/admin/restaurants/${id}`),

  users: (params?: Record<string, string>) =>
    get<{ users: unknown[]; total: number }>(`/admin/users${qs(params ?? {})}`),

  updateUserRole: (id: string, role: string, restaurantSlug?: string) =>
    put<{ user: unknown }>(`/admin/users/${id}/role`, { role, restaurantSlug }),

  banUser: (id: string) =>
    put<{ user: unknown; banned: boolean }>(`/admin/users/${id}/ban`, {}),

  categories: () =>
    get<{ categories: unknown[] }>("/admin/categories"),

  createPlatformCategory: (data: unknown) =>
    post<{ category: unknown }>("/admin/categories", data),

  updatePlatformCategory: (id: string, data: unknown) =>
    put<{ category: unknown }>(`/admin/categories/${id}`, data),

  deletePlatformCategory: (id: string) =>
    del<{ message: string }>(`/admin/categories/${id}`),

  coupons: () =>
    get<{ coupons: unknown[] }>("/admin/coupons"),

  createCoupon: (data: unknown) =>
    post<{ coupon: unknown }>("/admin/coupons", data),

  updateCoupon: (id: string, data: unknown) =>
    put<{ coupon: unknown }>(`/admin/coupons/${id}`, data),

  deleteCoupon: (id: string) =>
    del<{ message: string }>(`/admin/coupons/${id}`),

  settings: () =>
    get<{ settings: unknown }>("/admin/settings"),

  updateSettings: (data: unknown) =>
    put<{ settings: unknown }>("/admin/settings", data),

  menuItems: (restaurantSlug?: string) =>
    get<{ items: unknown[] }>(`/admin/menu-items${restaurantSlug ? `?restaurantSlug=${restaurantSlug}` : ""}`),

  updateMenuItem: (id: string, data: unknown) =>
    put<{ item: unknown }>(`/admin/menu-items/${id}`, data),

  riders: (search?: string) =>
    get<{ riders: unknown[] }>(`/admin/riders${search ? `?search=${encodeURIComponent(search)}` : ""}`),

  assignRider: (orderId: string, riderId: string) =>
    post<{ order: unknown }>(`/admin/orders/${orderId}/assign`, { riderId }),

  unassignRider: (orderId: string) =>
    del<{ order: unknown }>(`/admin/orders/${orderId}/assign`),
};
