"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus, Flame } from "lucide-react";
import type { MenuItem } from "@/types/restaurant";

interface FoodCardProps {
  item: MenuItem;
  restaurantId: string;
}

export default function FoodCard({ item, restaurantId }: FoodCardProps) {
  return (
    <Link
      href={`/restaurants/${restaurantId}/item/${item.id}`}
      className="group flex gap-4 bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all"
    >
      {/* Image */}
      <div className="relative w-28 h-24 rounded-xl overflow-hidden shrink-0 bg-gray-100">
        <Image
          src={item.image}
          alt={item.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            {item.isPopular && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-[#ff6b35] bg-[#fff3ef] px-1.5 py-0.5 rounded-full">
                <Flame className="w-2.5 h-2.5" /> Popular
              </span>
            )}
            {item.isVeg && (
              <span className="w-3.5 h-3.5 rounded-sm border-2 border-green-600 flex items-center justify-center shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 text-[14px] leading-snug line-clamp-1">
            {item.name}
          </h3>
          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="text-[15px] font-bold text-gray-900">
            ${item.price.toFixed(2)}
          </span>
          <div className="w-8 h-8 rounded-full bg-[#ff6b35] flex items-center justify-center shadow-sm group-hover:bg-[#e55a26] transition-colors">
            <Plus className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    </Link>
  );
}
