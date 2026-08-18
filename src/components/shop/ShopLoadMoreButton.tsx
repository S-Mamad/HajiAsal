"use client";

import { CaretDown } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

interface ShopLoadMoreButtonProps {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}

export function ShopLoadMoreButton({
  hasMore,
  loading,
  onLoadMore,
}: ShopLoadMoreButtonProps) {
  if (!hasMore && !loading) return null;

  return (
    <div className="flex justify-center pt-8">
      <button
        type="button"
        onClick={onLoadMore}
        disabled={loading || !hasMore}
        className={cn(
          "inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-white px-5 text-[13px] text-secondary transition",
          "hover:border-gold/40 hover:text-primary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/35",
          "disabled:pointer-events-none disabled:opacity-60",
        )}
      >
        {loading ? (
          "در حال بارگذاری..."
        ) : (
          <>
            مشاهده بیشتر
            <Icon icon={CaretDown} size={12} className="text-dim" />
          </>
        )}
      </button>
    </div>
  );
}
