export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:gap-8"
      aria-hidden
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bezel-outer">
          <div className="bezel-inner bg-surface p-4">
            <div className="mb-4 aspect-square animate-pulse rounded-xl bg-cream-dark" />
            <div className="mb-2 h-3 w-1/3 animate-pulse rounded bg-cream-dark" />
            <div className="mb-3 h-4 w-2/3 animate-pulse rounded bg-cream-dark" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-cream-dark" />
          </div>
        </div>
      ))}
    </div>
  );
}
