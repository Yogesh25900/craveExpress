import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  reviewCount?: number;
  size?: "sm" | "md";
}

export default function StarRating({ rating, reviewCount, size = "sm" }: StarRatingProps) {
  const iconSize = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  const textSize = size === "md" ? "text-sm" : "text-xs";

  return (
    <div className="flex items-center gap-1">
      <Star className={`${iconSize} fill-amber-400 text-amber-400`} />
      <span className={`${textSize} font-semibold text-gray-800`}>{rating.toFixed(1)}</span>
      {reviewCount !== undefined && (
        <span className={`${textSize} text-gray-400`}>({reviewCount})</span>
      )}
    </div>
  );
}
