"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { categoryApi } from "@/lib/api";

interface PlatformCat {
  id:    string;
  name:  string;
  emoji: string;
}

export default function CategorySection() {
  const [cats, setCats] = useState<PlatformCat[]>([]);

  useEffect(() => {
    categoryApi.list()
      .then(({ categories }) => setCats(categories))
      .catch(() => {});
  }, []);

  if (cats.length === 0) return null;

  return (
    <section className="py-14 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Explore by Category</h2>

        <div className="flex gap-6 sm:gap-10 overflow-x-auto pb-2">
          {cats.map((cat) => (
            <Link
              key={cat.id}
              href={`/restaurants?category=${cat.id}`}
              className="flex flex-col items-center gap-3 group shrink-0"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-transparent group-hover:border-[#ff6b35] transition-all shadow-md bg-gray-100 flex items-center justify-center">
                <span className="text-3xl sm:text-4xl">{cat.emoji}</span>
              </div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-[#ff6b35] transition-colors">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
