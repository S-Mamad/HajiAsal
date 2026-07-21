"use client";

import {
  useCallback,
  Suspense,
  useState,
  useEffect,
  useMemo,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Faders } from "@phosphor-icons/react";
import type { Product, ProductCategory, SortOption } from "@/types";
import { getPriceRange } from "@/lib/products";
import site from "@/data/site.json";
import type { SiteConfig } from "@/types";
import { ProductGrid } from "@/components/product/ProductGrid";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Pagination } from "@/components/ui/Pagination";
import { ShopEmptyState } from "@/components/shop/ShopEmptyState";
import { ErrorState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { hajiasalPath } from "@/lib/paths";

const siteData = site as SiteConfig;
const priceRange = getPriceRange();
const PAGE_SIZE = 12;

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "popular", label: "محبوب‌ترین" },
  { value: "price-asc", label: "ارزان‌ترین" },
  { value: "price-desc", label: "گران‌ترین" },
  { value: "newest", label: "جدیدترین" },
];

function FiltersPanel({
  category,
  sort,
  maxPrice,
  priceBounds,
  inStockOnly,
  updateParams,
  onClose,
}: {
  category: ProductCategory | null;
  sort: SortOption;
  maxPrice: number;
  priceBounds: { min: number; max: number };
  inStockOnly: boolean;
  updateParams: (updates: Record<string, string | null>) => void;
  onClose?: () => void;
}) {
  return (
    <div className="space-y-6">
      {onClose ? (
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-primary">فیلترها</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-secondary"
          >
            بستن
          </button>
        </div>
      ) : null}

      <div>
        <h3 className="mb-3 text-sm font-semibold text-primary">دسته‌بندی</h3>
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
          {siteData.categories.map((cat) => (
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
        <h3 className="mb-3 text-sm font-semibold text-primary">محدوده قیمت</h3>
        <input
          type="range"
          min={priceBounds.min}
          max={priceBounds.max}
          step={50000}
          value={maxPrice}
          onChange={(e) => updateParams({ maxPrice: e.target.value })}
          className="w-full accent-[var(--gold)]"
        />
        <p className="mt-2 text-xs text-secondary tabular-nums">
          تا {maxPrice.toLocaleString("fa-IR")} تومان
        </p>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-primary">مرتب‌سازی</h3>
        <select
          value={sort}
          onChange={(e) => updateParams({ sort: e.target.value })}
          className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-primary focus:border-gold/50 focus:outline-none"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm text-secondary">
        <input
          type="checkbox"
          checked={inStockOnly}
          onChange={(e) =>
            updateParams({ inStock: e.target.checked ? "1" : null })
          }
          className="accent-[var(--gold)]"
        />
        فقط موجود
      </label>
    </div>
  );
}

function ShopContentInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [priceMeta, setPriceMeta] = useState(priceRange);

  const category = (searchParams.get("category") as ProductCategory) || null;
  const sort = (searchParams.get("sort") as SortOption) || "popular";
  const maxPrice = Number(searchParams.get("maxPrice") || priceRange.max);
  const inStockOnly = searchParams.get("inStock") === "1";
  const pageParam = Number(searchParams.get("page") || "1");

  const updateParams = useCallback(
    (
      updates: Record<string, string | null>,
      options?: { resetPage?: boolean },
    ) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      if (options?.resetPage !== false && !("page" in updates)) {
        params.delete("page");
      }
      const qs = params.toString();
      router.push(
        qs ? `${hajiasalPath("/shop")}?${qs}` : hajiasalPath("/shop"),
        { scroll: false },
      );
    },
    [searchParams, router],
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const qs = new URLSearchParams();
        if (category) qs.set("category", category);
        if (sort) qs.set("sort", sort);
        if (maxPrice) qs.set("maxPrice", String(maxPrice));
        if (inStockOnly) qs.set("inStock", "1");
        const res = await fetch(`/api/products?${qs.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "خطا در بارگذاری فروشگاه");
        if (!cancelled) {
          setProducts(data.products ?? []);
          if (data.meta?.priceRange?.min != null && data.meta?.priceRange?.max != null) {
            setPriceMeta({
              min: Number(data.meta.priceRange.min),
              max: Number(data.meta.priceRange.max),
            });
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "خطا");
          setProducts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [category, sort, maxPrice, inStockOnly]);

  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, pageParam || 1), totalPages);
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return products.slice(start, start + PAGE_SIZE);
  }, [products, page]);

  const goToPage = useCallback(
    (next: number) => {
      const safe = Math.min(Math.max(1, next), totalPages);
      updateParams(
        { page: safe <= 1 ? null : String(safe) },
        { resetPage: false },
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [totalPages, updateParams],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-14">
      <div className="mb-6 flex items-end justify-between gap-4 md:mb-8">
        <SectionHeading
          title="فروشگاه"
          subtitle={
            loading
              ? "در حال بارگذاری..."
              : products.length > PAGE_SIZE
                ? `${products.length.toLocaleString("fa-IR")} محصول · صفحه ${page.toLocaleString("fa-IR")} از ${totalPages.toLocaleString("fa-IR")}`
                : `${products.length.toLocaleString("fa-IR")} محصول`
          }
        />
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-border-bright bg-surface px-3 py-2.5 text-sm text-primary lg:hidden"
        >
          <Faders size={16} />
          فیلتر
        </button>
      </div>

      {error ? (
        <ErrorState
          className="mb-6"
          title="بارگذاری فروشگاه ناموفق بود"
          description={error}
        />
      ) : null}

      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24 rounded-2xl border border-border bg-surface p-5">
            <FiltersPanel
              category={category}
              sort={sort}
              maxPrice={maxPrice}
              priceBounds={priceMeta}
              inStockOnly={inStockOnly}
              updateParams={(u) => updateParams(u)}
            />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {loading ? (
            <p className="text-sm text-secondary">در حال بارگذاری محصولات...</p>
          ) : products.length > 0 ? (
            <>
              <ProductGrid products={paged} />
              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={goToPage}
              />
            </>
          ) : (
            <ShopEmptyState />
          )}
        </div>
      </div>

      {filtersOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 overlay-scrim backdrop-blur-sm"
            aria-label="بستن فیلتر"
            onClick={() => setFiltersOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl border border-border-bright bg-surface p-5 pb-8 shadow-2xl">
            <FiltersPanel
              category={category}
              sort={sort}
              maxPrice={maxPrice}
              priceBounds={priceMeta}
              inStockOnly={inStockOnly}
              updateParams={updateParams}
              onClose={() => setFiltersOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ShopContent() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-secondary">
          در حال بارگذاری...
        </div>
      }
    >
      <ShopContentInner />
    </Suspense>
  );
}
