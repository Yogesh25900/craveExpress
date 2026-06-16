"use client";

interface CategoryPillProps {
  label: string;
  emoji?: string;
  active?: boolean;
  onClick?: () => void;
  removable?: boolean;
  onRemove?: () => void;
}

export default function CategoryPill({
  label, emoji, active, onClick, removable, onRemove,
}: CategoryPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
        active
          ? "bg-[#ff6b35] text-white border-[#ff6b35] shadow-sm"
          : "bg-white text-gray-600 border-gray-200 hover:border-[#ff6b35] hover:text-[#ff6b35]"
      }`}
    >
      {emoji && <span className="text-base leading-none">{emoji}</span>}
      {label}
      {removable && onRemove && (
        <span
          role="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-1 w-4 h-4 rounded-full bg-white/30 hover:bg-white/50 flex items-center justify-center text-xs leading-none"
          aria-label={`Remove ${label} filter`}
        >
          ×
        </span>
      )}
    </button>
  );
}
