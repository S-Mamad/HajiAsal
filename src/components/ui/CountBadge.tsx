import { cn } from "@/lib/utils";

interface CountBadgeProps {
  count: number;
  className?: string;
  /** Cap display at this number (shows N+) */
  cap?: number;
}

/** Minimal cart/wishlist count pill */
export function CountBadge({ count, className, cap = 9 }: CountBadgeProps) {
  if (count <= 0) return null;

  const label =
    count > cap
      ? `${cap.toLocaleString("fa-IR")}+`
      : count.toLocaleString("fa-IR");

  return (
    <span
      className={cn(
        "absolute -top-0.5 -end-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-gold px-1 text-[9px] font-semibold leading-none text-ink-on-gold tabular-nums",
        className,
      )}
      aria-hidden
    >
      {label}
    </span>
  );
}
