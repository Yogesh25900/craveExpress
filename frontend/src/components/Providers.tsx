"use client";

import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { FavouritesProvider } from "@/context/FavouritesContext";
import type { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <FavouritesProvider>{children}</FavouritesProvider>
      </CartProvider>
    </AuthProvider>
  );
}
