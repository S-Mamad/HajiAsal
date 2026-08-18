import { cn } from "@/lib/utils";
import { displayRating, ratingStarFills } from "@/lib/rating-stars";

interface RatingStarsProps {
  rating: number;
  reviewCount?: number;
  size?: "sm" | "md";
  showValue?: boolean;
  className?: string;
}

/** Material star, centered in 24×24 so a 50% clip is a true half. */
const STAR_PATH =
  "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";

function StarGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("block h-full w-full", className)}
      aria-hidden
    >
      <path fill="currentColor" d={STAR_PATH} />
    </svg>
  );
}

function RatingStar({ fill, size }: { fill: number; size: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, fill)) * 100);

  return (
    <span
      className="relative inline-block shrink-0 overflow-hidden"
      style={{ width: size, height: size }}
      data-fill={pct}
    >
      {pct >= 100 ? (
        <span className="absolute inset-0 text-gold">
          <StarGlyph />
        </span>
      ) : (
        <>
          <span className="absolute inset-0 text-star-empty">
            <StarGlyph />
          </span>
          {pct > 0 ? (
            <span
              className="absolute inset-y-0 start-0 overflow-hidden text-gold"
              data-clip
              style={{ width: `${pct}%` }}
            >
              <span
                className="absolute start-0 top-0"
                style={{ width: size, height: size }}
              >
                <StarGlyph />
              </span>
            </span>
          ) : null}
        </>
      )}
    </span>
  );
}

export function RatingStars({
  rating,
  reviewCount,
  size = "sm",
  showValue = true,
  className,
}: RatingStarsProps) {
  const px = size === "sm" ? 14 : 16;
  const value = displayRating(rating);
  const fills = ratingStarFills(value);
  const ratingLabel = value.toLocaleString("fa-IR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 1,
  });
  const label = `امتیاز ${ratingLabel} از ۵`;

  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      role="img"
      aria-label={
        reviewCount !== undefined
          ? `${label}، ${reviewCount.toLocaleString("fa-IR")} نظر`
          : label
      }
    >
      <div className="flex items-center gap-px" aria-hidden>
        {fills.map((fill, i) => (
          <RatingStar key={i} fill={fill} size={px} />
        ))}
      </div>
      {showValue ? (
        <span
          className="min-w-0 truncate text-[11px] text-secondary tabular-nums sm:text-xs"
          aria-hidden
        >
          {ratingLabel}
          {reviewCount !== undefined
            ? ` (${reviewCount.toLocaleString("fa-IR")})`
            : null}
        </span>
      ) : null}
    </div>
  );
}
