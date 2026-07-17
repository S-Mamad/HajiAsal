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
    sm: "text-sm",
    md: "text-base",
    lg: "text-2xl md:text-3xl",
  };

  if (discountPrice && discountPrice < price) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span
          className={cn("font-bold text-gold", sizeClasses[size])}
        >
          {formatPrice(discountPrice)}
        </span>
        <span
          className={cn(
            "text-dim line-through",
            size === "lg" ? "text-sm" : "text-xs",
          )}
        >
          {formatPrice(price)}
        </span>
      </div>
    );
  }

  return (
    <span
      className={cn("font-bold text-gold", sizeClasses[size], className)}
    >
      {formatPrice(price)}
    </span>
  );
}
