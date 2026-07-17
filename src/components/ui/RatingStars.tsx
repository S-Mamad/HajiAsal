"use client";

"use client";

import { Star } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  rating: number;
  reviewCount?: number;
  size?: "sm" | "md";
  showValue?: boolean;
  className?: string;
}

export function RatingStars({
  rating,
  reviewCount,
  size = "sm",
  showValue = true,
  className,
}: RatingStarsProps) {
  const iconSize = size === "sm" ? 14 : 18;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="flex items-center gap-0.5" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i < Math.floor(rating);
          const half = !filled && i < rating;
          return (
            <Star
              key={i}
              size={iconSize}
              weight={filled || half ? "fill" : "regular"}
              className={cn(
                filled || half ? "text-gold" : "text-dim",
                half && "opacity-50",
              )}
            />
          );
        })}
      </div>
      {showValue ? (
        <span className="text-xs text-secondary tabular-nums">
          {rating.toLocaleString("fa-IR")}
          {reviewCount !== undefined
            ? ` (${reviewCount.toLocaleString("fa-IR")})`
            : null}
        </span>
      ) : (
        <span className="sr-only">
          امتیاز {rating.toLocaleString("fa-IR")} از ۵
        </span>
      )}
    </div>
  );
}
