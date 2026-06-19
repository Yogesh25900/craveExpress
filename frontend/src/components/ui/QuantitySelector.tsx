"use client";

import { Minus, Plus } from "lucide-react";

interface QuantitySelectorProps {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  min?: number;
  max?: number;
  size?: "sm" | "md" | "lg";
}

export default function QuantitySelector({
  quantity, onIncrease, onDecrease, min = 1, max = 99, size = "md",
}: QuantitySelectorProps) {
  const btnBase =
    "flex items-center justify-center rounded-full border transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const sizes = {
    sm: { btn: "w-7 h-7", icon: "w-3.5 h-3.5", text: "text-sm w-6" },
    md: { btn: "w-9 h-9", icon: "w-4 h-4",   text: "text-base w-8" },
    lg: { btn: "w-11 h-11", icon: "w-5 h-5",  text: "text-lg w-10" },
  }[size];

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onDecrease}
        disabled={quantity <= min}
        className={`${btnBase} ${sizes.btn} border-gray-200 bg-white hover:border-[#ff6b35] hover:text-[#ff6b35] text-gray-600`}
      >
        <Minus className={sizes.icon} />
      </button>
      <span className={`${sizes.text} font-semibold text-gray-900 text-center tabular-nums`}>
        {quantity}
      </span>
      <button
        type="button"
        onClick={onIncrease}
        disabled={quantity >= max}
        className={`${btnBase} ${sizes.btn} border-[#ff6b35] bg-[#ff6b35] hover:bg-[#e55a26] text-white`}
      >
        <Plus className={sizes.icon} />
      </button>
    </div>
  );
}
