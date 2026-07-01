"use client";

import { useState, useRef, useEffect } from "react";
import type { MenuItem, MenuCategory } from "@/types/restaurant";
import FoodCard from "@/components/ui/FoodCard";

interface MenuTabsProps {
  restaurantId: string;
  categories: MenuCategory[];
  items: MenuItem[];
}

export default function MenuTabs({ restaurantId, categories, items }: MenuTabsProps) {
  const [activeId, setActiveId] = useState(categories[0]?.id ?? "");
  const tabsRef = useRef<HTMLDivElement>(null);

  // Group items by category
  const grouped = categories.reduce<Record<string, MenuItem[]>>((acc, cat) => {
    acc[cat.id] = items.filter((i) => i.category === cat.id);
    return acc;
  }, {});

  function handleTabClick(catId: string) {
    setActiveId(catId);
    const section = document.getElementById(`cat-${catId}`);
    if (section) {
      // Account for sticky navbar (64px) + sticky tabs bar (~52px) + gap
      const offset = 130;
      const top = section.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }

  // Scroll active tab into view in the tabs bar
  useEffect(() => {
    const tabEl = tabsRef.current?.querySelector(`[data-cat="${activeId}"]`) as HTMLElement | null;
    tabEl?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [activeId]);

  return (
    <div>
      {/* Sticky tabs bar */}
      <div className="sticky top-16 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div
          ref={tabsRef}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1 overflow-x-auto py-3 scrollbar-hide"
        >
          {categories.map((cat) => (
            <button
              key={cat.id}
              data-cat={cat.id}
              onClick={() => handleTabClick(cat.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                activeId === cat.id
                  ? "bg-[#ff6b35] text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat.name}
              {grouped[cat.id]?.length ? (
                <span className={`ml-1.5 text-xs ${activeId === cat.id ? "text-white/70" : "text-gray-400"}`}>
                  {grouped[cat.id].length}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Menu sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10">
        {categories.map((cat) => {
          const catItems = grouped[cat.id] ?? [];
          if (!catItems.length) return null;
          return (
            <section key={cat.id} id={`cat-${cat.id}`}>
              <h2 className="text-lg font-bold text-gray-900 mb-4">{cat.name}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {catItems.map((item) => (
                  <FoodCard key={item.id} item={item} restaurantId={restaurantId} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
