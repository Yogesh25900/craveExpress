"use client";

import {
  createContext, useContext, useState, useEffect, useCallback, type ReactNode,
} from "react";

interface FavouritesContextType {
  favourites: Set<string>;
  isFavourite: (restaurantId: string) => boolean;
  toggleFavourite: (restaurantId: string) => void;
  count: number;
}

const FavouritesContext = createContext<FavouritesContextType | null>(null);
const LS_KEY = "ce_favs";

export function FavouritesProvider({ children }: { children: ReactNode }) {
  const [favourites, setFavourites] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setFavourites(new Set(JSON.parse(raw) as string[]));
    } catch {
      // ignore corrupt data
    }
  }, []);

  const toggleFavourite = useCallback((id: string) => {
    setFavourites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem(LS_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const isFavourite = useCallback(
    (id: string) => favourites.has(id),
    [favourites]
  );

  return (
    <FavouritesContext.Provider
      value={{ favourites, isFavourite, toggleFavourite, count: favourites.size }}
    >
      {children}
    </FavouritesContext.Provider>
  );
}

export function useFavourites(): FavouritesContextType {
  const ctx = useContext(FavouritesContext);
  if (!ctx) throw new Error("useFavourites must be inside <FavouritesProvider>");
  return ctx;
}
