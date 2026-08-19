import { cn, formatPrice } from "@/lib/utils";

interface PriceDisplayProps {
  price: number;
  discountPrice?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PriceDisplay({
  price,
  discountPrice,
  size = "md",
  className,
}: PriceDisplayProps) {
  const sizeClasses = {
    sm: "text-sm leading-none",
    md: "text-base leading-none",
    lg: "text-2xl leading-none md:text-3xl",
  };

  if (discountPrice && discountPrice < price) {
    return (
      <div
        className={cn(
          "flex min-w-0 flex-wrap items-baseline justify-start gap-x-1.5 gap-y-0.5",
          className,
        )}
      >
        <span className={cn("shrink-0 font-bold text-gold", sizeClasses[size])}>
          {formatPrice(discountPrice)}
        </span>
        <span
          className={cn(
            "min-w-0 truncate text-dim line-through",
            size === "lg" ? "text-sm" : "text-[10px] sm:text-xs",
          )}
        >
          {formatPrice(price)}
        </span>
      </div>
    );
  }

  return (
    <span
      className={cn(
        "block min-w-0 truncate text-start font-bold text-gold",
        sizeClasses[size],
        className,
      )}
    >
      {formatPrice(price)}
    </span>
  );
}
