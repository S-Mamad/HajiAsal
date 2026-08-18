import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-surface-muted",
        className,
      )}
      aria-hidden
    />
  );
}

export function CartSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="در حال بارگذاری سبد">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex gap-3 rounded-2xl border border-border bg-surface p-3"
        >
          <Skeleton className="h-16 w-16 shrink-0 rounded-xl sm:h-20 sm:w-20" />
          <div className="flex flex-1 flex-col gap-2 py-1">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
            <div className="mt-auto flex justify-between">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AddressCardSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="در حال بارگذاری آدرس‌ها">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-white px-2.5 py-2"
        >
          <Skeleton className="mb-1 h-3.5 w-2/5" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}
