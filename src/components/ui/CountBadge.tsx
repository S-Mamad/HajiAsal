import { cn } from "@/lib/utils";

interface CountBadgeProps {
  count: number;
  className?: string;
  /** Cap display at this number (shows N+) */
  cap?: number;
}

/** Cart/wishlist count pill — compact, readable Persian digits */
export function CountBadge({ count, className, cap = 9 }: CountBadgeProps) {
  if (count <= 0) return null;

  const capped = count > cap;
  const label = capped
    ? `${cap.toLocaleString("fa-IR")}+`
    : count.toLocaleString("fa-IR");

  return (
    <span
      className={cn(
        "pointer-events-none absolute -top-1 -end-1 z-[1]",
        "inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center",
        "rounded-full bg-gold font-bold text-ink-on-gold",
        "text-[10px] leading-none tabular-nums",
        "ring-2 ring-[var(--surface)]",
        "shadow-[0_1px_3px_rgb(0_0_0/0.18)]",
        capped ? "px-1" : "px-0.5",
        className,
      )}
      aria-hidden
    >
      <span className="relative top-px select-none">{label}</span>
    </span>
  );
}
