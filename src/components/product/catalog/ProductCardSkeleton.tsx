export function ProductCardSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-border bg-surface"
      aria-hidden
    >
      <div className="aspect-square animate-pulse bg-surface-muted" />
      <div className="space-y-2 p-3 sm:p-4">
        <div className="h-2.5 w-1/3 animate-pulse rounded bg-surface-muted" />
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-surface-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-surface-muted" />
        <div className="h-4 w-24 animate-pulse rounded bg-surface-muted" />
      </div>
    </div>
  );
}
