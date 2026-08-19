"use client";

import {
  useCallback,
  Suspense,
  useState,
  useEffect,
  useRef,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { Product, ProductCategory, SortOption } from "@/types";
import { getPriceRange } from "@/lib/products";
import site from "@/data/site.json";
import type { SiteConfig } from "@/types";
import { ProductGrid, ProductCardSkeleton } from "@/components/product";
import { ShopSearchField } from "@/components/shop/ShopSearchField";
import { ShopEmptyState } from "@/components/shop/ShopEmptyState";
import { ShopInStockToggle } from "@/components/shop/ShopInStockToggle";
import { ShopLoadMoreButton } from "@/components/shop/ShopLoadMoreButton";
import {
  ShopFilterBar,
  type ShopFilterSheetId,
} from "@/components/shop/ShopFilterBar";
import { ShopMobileFilterSheets } from "@/components/shop/ShopMobileFilterSheets";
import { ShopSortMenu } from "@/components/shop/ShopSortMenu";
import { ErrorState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { hajiasalPath } from "@/lib/paths";
import { parseSortOption, SHOP_PAGE_SIZE } from "@/lib/shop-catalog";

const siteData = site as SiteConfig;
const seedPriceRange = getPriceRange();

export type ShopCategoryChip = { id: string; label: string };

function DesktopFiltersPanel({
  category,
  sort,
  maxPrice,
  priceBounds,
  inStockOnly,
  updateParams,
  categories,
}: {
  category: ProductCategory | null;
  sort: SortOption;
  maxPrice: number;
  priceBounds: { min: number; max: number };
  inStockOnly: boolean;
  updateParams: (updates: Record<string, string | null>) => void;
  categories: ShopCategoryChip[];
}) {
  const sliderMax = Math.max(priceBounds.max, priceBounds.min);
  const sliderValue = Math.min(Math.max(maxPrice, priceBounds.min), sliderMax);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-3 text-[13px] font-medium text-secondary">
          دسته‌بندی
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => updateParams({ category: null })}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs transition-colors",
              !category
                ? "bg-gold text-ink-on-gold"
                : "bg-surface-elevated text-secondary hover:text-primary",
            )}
          >
            همه
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => updateParams({ category: cat.id })}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs transition-colors",
                category === cat.id
                  ? "bg-gold text-ink-on-gold"
                  : "bg-surface-elevated text-secondary hover:text-primary",
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-[13px] font-medium text-secondary">
          محدوده قیمت
        </h3>
        <input
          type="range"
          min={priceBounds.min}
          max={sliderMax}
          step={50000}
          value={sliderValue}
          onChange={(e) => updateParams({ maxPrice: e.target.value })}
          className="w-full accent-[var(--gold)]"
        />
        <p className="mt-2 text-xs text-secondary tabular-nums">
          تا {sliderValue.toLocaleString("fa-IR")} تومان
        </p>
      </div>

      <ShopSortMenu
        value={sort}
        onChange={(next) => updateParams({ sort: next === "popular" ? null : next })}
      />

      <ShopInStockToggle
        checked={inStockOnly}
        onChange={(checked) =>
          updateParams({ inStock: checked ? "1" : null })
        }
      />
    </div>
  );
}

function InitialGridSkeleton() {
  return (
    <ul className="m-0 grid w-full min-w-0 list-none grid-cols-2 gap-x-2.5 gap-y-3 p-0 sm:gap-x-3 sm:gap-y-4 md:grid-cols-3 md:gap-x-5 md:gap-y-5 lg:gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={`init-skel-${i}`} className="min-w-0">
          <ProductCardSkeleton />
        </li>
      ))}
    </ul>
  );
}

function ShopContentInner({
  categories,
}: {
  categories: ShopCategoryChip[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeSheet, setActiveSheet] = useState<ShopFilterSheetId | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [priceMeta, setPriceMeta] = useState(seedPriceRange);
  const loadingMoreLock = useRef(false);
  const fetchGen = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const rawCategory = searchParams.get("category");
  const category =
    rawCategory && categories.some((c) => c.id === rawCategory)
      ? (rawCategory as ProductCategory)
      : null;
  const sort = parseSortOption(searchParams.get("sort"));
  const maxPriceParam = searchParams.get("maxPrice");
  const maxPrice = maxPriceParam
    ? Number(maxPriceParam)
    : priceMeta.max || seedPriceRange.max;
  const inStockOnly = searchParams.get("inStock") === "1";
  const searchQuery = (
    searchParams.get("q") ||
    searchParams.get("search") ||
    ""
  ).trim();

  const buildQuery = useCallback(
    (pageNum: number) => {
      const qs = new URLSearchParams();
      if (category) qs.set("category", category);
      if (sort && sort !== "popular") qs.set("sort", sort);
      if (maxPriceParam) qs.set("maxPrice", maxPriceParam);
      if (inStockOnly) qs.set("inStock", "1");
      if (searchQuery) qs.set("q", searchQuery);
      qs.set("page", String(pageNum));
      qs.set("limit", String(SHOP_PAGE_SIZE));
      return qs;
    },
    [category, sort, maxPriceParam, inStockOnly, searchQuery],
  );

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      params.delete("page");
      const qs = params.toString();
      router.push(
        qs ? `${hajiasalPath("/shop")}?${qs}` : hajiasalPath("/shop"),
        { scroll: false },
      );
    },
    [searchParams, router],
  );

  useEffect(() => {
    const raw = searchParams.get("category");
    if (!raw) return;
    if (categories.some((c) => c.id === raw)) return;
    updateParams({ category: null });
  }, [categories, searchParams, updateParams]);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const gen = ++fetchGen.current;
    loadingMoreLock.current = false;

    const run = async () => {
      setLoading(true);
      setLoadingMore(false);
      setError("");
      setPage(1);
      try {
        const res = await fetch(`/api/products?${buildQuery(1).toString()}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "خطا در بارگذاری فروشگاه");
        if (gen !== fetchGen.current) return;
        setProducts(data.products ?? []);
        setHasMore(Boolean(data.meta?.hasMore));
        setPage(1);
        if (
          data.meta?.priceRange?.min != null &&
          data.meta?.priceRange?.max != null
        ) {
          setPriceMeta({
            min: Number(data.meta.priceRange.min),
            max: Number(data.meta.priceRange.max),
          });
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        if (gen !== fetchGen.current) return;
        setError(err instanceof Error ? err.message : "خطا");
        setProducts([]);
        setHasMore(false);
      } finally {
        if (gen === fetchGen.current) setLoading(false);
      }
    };
    void run();
    return () => {
      controller.abort();
    };
  }, [buildQuery]);

  const onLoadMore = useCallback(() => {
    if (loadingMoreLock.current || loading || loadingMore || !hasMore) return;
    loadingMoreLock.current = true;
    const nextPage = page + 1;
    const gen = fetchGen.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoadingMore(true);
    void (async () => {
      try {
        const res = await fetch(
          `/api/products?${buildQuery(nextPage).toString()}`,
          { signal: controller.signal },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "خطا در بارگذاری بیشتر");
        if (gen !== fetchGen.current) return;
        setProducts((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          const appended = (data.products as Product[] | undefined)?.filter(
            (p) => !seen.has(p.id),
          );
          return appended?.length ? [...prev, ...appended] : prev;
        });
        setHasMore(Boolean(data.meta?.hasMore));
        setPage(nextPage);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (gen !== fetchGen.current) return;
        setError(err instanceof Error ? err.message : "خطا");
      } finally {
        if (gen === fetchGen.current) {
          setLoadingMore(false);
          loadingMoreLock.current = false;
        }
      }
    })();
  }, [buildQuery, hasMore, loading, loadingMore, page]);

  const closeSheet = () => setActiveSheet(null);

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl px-4 py-8 md:px-8 md:py-14">
      <div className="mb-4 min-w-0 space-y-4 md:mb-6">
        <ShopSearchField
          value={searchQuery}
          onSearch={(term) => {
            const t = term.trim();
            updateParams({ q: t || null, search: null });
          }}
          onClear={() => updateParams({ q: null, search: null })}
        />
        <div className="min-w-0 lg:hidden">
          <ShopFilterBar
            sort={sort}
            category={category}
            inStockOnly={inStockOnly}
            maxPriceParam={maxPriceParam}
            searchQuery={searchQuery || undefined}
            categories={categories}
            onOpenSheet={setActiveSheet}
            updateParams={updateParams}
          />
        </div>
      </div>

      {error ? (
        <ErrorState
          className="mb-6"
          title="بارگذاری فروشگاه ناموفق بود"
          description={error}
        />
      ) : null}

      <div className="flex min-w-0 flex-col gap-8 lg:flex-row">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24 rounded-2xl border border-border bg-surface p-5">
            <DesktopFiltersPanel
              category={category}
              sort={sort}
              maxPrice={maxPrice}
              priceBounds={priceMeta}
              inStockOnly={inStockOnly}
              updateParams={updateParams}
              categories={categories}
            />
          </div>
        </aside>

        <div className="min-w-0 flex-1 pb-32">
          {loading ? (
            <InitialGridSkeleton />
          ) : products.length > 0 ? (
            <>
              <ProductGrid products={products} className="pb-0" />
              <ShopLoadMoreButton
                hasMore={hasMore}
                loading={loadingMore}
                onLoadMore={onLoadMore}
              />
            </>
          ) : (
            <ShopEmptyState
              searchQuery={searchQuery || undefined}
              inStockOnly={inStockOnly}
            />
          )}
        </div>
      </div>

      <ShopMobileFilterSheets
        sheet={activeSheet}
        onClose={closeSheet}
        sort={sort}
        category={category}
        categories={categories}
        maxPrice={maxPrice}
        priceBounds={priceMeta}
        updateParams={updateParams}
      />
    </div>
  );
}

export function ShopContent({
  categories,
}: {
  categories?: ShopCategoryChip[];
}) {
  const chips =
    categories && categories.length > 0
      ? categories
      : siteData.categories.map((c) => ({ id: c.id, label: c.label }));
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-secondary">
          در حال بارگذاری...
        </div>
      }
    >
      <ShopContentInner categories={chips} />
    </Suspense>
  );
}
