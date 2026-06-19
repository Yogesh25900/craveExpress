"use client";

import {
  createContext, useContext, useReducer, useEffect,
  useCallback, type ReactNode,
} from "react";
import type { CartItem, Cart } from "@/types/cart";
import type { Addon } from "@/types/restaurant";

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeCartItemId(menuItemId: string, addons: Addon[]): string {
  const addonKey = addons.map((a) => a.id).sort().join("+");
  return addonKey ? `${menuItemId}__${addonKey}` : menuItemId;
}

function calcCart(items: CartItem[]): Cart {
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce(
    (s, i) =>
      s +
      i.quantity *
        (i.price + i.selectedAddons.reduce((a, ad) => a + ad.price, 0)),
    0
  );
  return { items, itemCount, subtotal };
}

// ─── Types ─────────────────────────────────────────────────────────────────

type AddPayload = Omit<CartItem, "cartItemId">;

type CartAction =
  | { type: "INIT"; payload: CartItem[] }
  | { type: "ADD"; payload: AddPayload }
  | { type: "REMOVE"; payload: { cartItemId: string } }
  | { type: "UPDATE_QTY"; payload: { cartItemId: string; quantity: number } }
  | { type: "CLEAR" };

interface CartContextType extends Cart {
  addItem: (item: AddPayload) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  isInCart: (menuItemId: string) => boolean;
}

// ─── Reducer ───────────────────────────────────────────────────────────────

function reducer(items: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case "INIT":
      return action.payload;

    case "ADD": {
      const id = makeCartItemId(action.payload.menuItemId, action.payload.selectedAddons);
      const existing = items.find((i) => i.cartItemId === id);
      if (existing) {
        return items.map((i) =>
          i.cartItemId === id ? { ...i, quantity: i.quantity + action.payload.quantity } : i
        );
      }
      return [...items, { ...action.payload, cartItemId: id }];
    }

    case "REMOVE":
      return items.filter((i) => i.cartItemId !== action.payload.cartItemId);

    case "UPDATE_QTY":
      if (action.payload.quantity <= 0)
        return items.filter((i) => i.cartItemId !== action.payload.cartItemId);
      return items.map((i) =>
        i.cartItemId === action.payload.cartItemId
          ? { ...i, quantity: action.payload.quantity }
          : i
      );

    case "CLEAR":
      return [];

    default:
      return items;
  }
}

// ─── Context ───────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextType | null>(null);
const STORAGE_KEY = "ce_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(reducer, []);

  // Rehydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "INIT", payload: JSON.parse(raw) as CartItem[] });
    } catch {
      // ignore corrupt data
    }
  }, []);

  // Persist on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((item: AddPayload) => dispatch({ type: "ADD", payload: item }), []);
  const removeItem = useCallback((cartItemId: string) => dispatch({ type: "REMOVE", payload: { cartItemId } }), []);
  const updateQuantity = useCallback((cartItemId: string, quantity: number) =>
    dispatch({ type: "UPDATE_QTY", payload: { cartItemId, quantity } }), []);
  const clearCart = useCallback(() => dispatch({ type: "CLEAR" }), []);
  const isInCart = useCallback(
    (menuItemId: string) => items.some((i) => i.menuItemId === menuItemId),
    [items]
  );

  return (
    <CartContext.Provider value={{ ...calcCart(items), addItem, removeItem, updateQuantity, clearCart, isInCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
