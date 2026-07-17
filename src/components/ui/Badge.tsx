import { cn } from "@/lib/utils";

interface BadgeProps {
  variant?: "bestseller" | "new" | "out-of-stock" | "default";
  children: React.ReactNode;
  className?: string;
}

export function Badge({
  variant = "default",
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-[10px] font-medium tracking-wide sm:text-[11px]",
        variant === "bestseller" && "text-gold",
        variant === "new" && "text-primary/80",
        variant === "out-of-stock" && "text-red-400/90",
        variant === "default" && "text-secondary",
        className,
      )}
    >
      {children}
    </span>
  );
}
