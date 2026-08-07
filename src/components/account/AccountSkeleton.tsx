import { cn } from "@/lib/utils";

export function AccountSkeleton({
  rows = 3,
  className,
  rowClassName,
}: {
  rows?: number;
  className?: string;
  rowClassName?: string;
}) {
  return (
    <div
      className={cn("space-y-3", className)}
      aria-busy="true"
      aria-label="در حال بارگذاری"
    >
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className={cn(
            "animate-pulse rounded-2xl bg-surface-muted",
            rowClassName ?? "h-24",
          )}
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}

export function AccountFormSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <div
      className="max-w-lg space-y-3 rounded-2xl border border-border bg-surface p-5 sm:p-6"
      aria-busy="true"
      aria-label="در حال بارگذاری"
    >
      {Array.from({ length: fields }, (_, i) => (
        <div
          key={i}
          className="h-11 animate-pulse rounded-xl bg-surface-muted"
          style={{ animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  );
}
