import { NextResponse } from "next/server";
import {
  filterProductsAsync,
  getAllCategories,
  getAllProductsAsync,
  searchProductsAsync,
} from "@/lib/server/products";
import { getDisplayPrice } from "@/lib/products";
import type { ProductCategory, SortOption } from "@/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") as ProductCategory | null;
  const sort = (searchParams.get("sort") as SortOption) || "popular";
  const minPrice = searchParams.get("minPrice")
    ? Number(searchParams.get("minPrice"))
    : undefined;
  const maxPrice = searchParams.get("maxPrice")
    ? Number(searchParams.get("maxPrice"))
    : undefined;
  const inStockOnly = searchParams.get("inStock") === "1";
  const search =
    searchParams.get("search")?.trim() ||
    searchParams.get("q")?.trim() ||
    undefined;

  let products = await filterProductsAsync({
    category: category ?? undefined,
    sort,
    minPrice,
    maxPrice,
    inStockOnly,
  });

  if (search) {
    const matched = await searchProductsAsync(search);
    const rank = new Map(matched.map((p, i) => [p.id, i]));
    products = products.filter((p) => rank.has(p.id));
    // Default “محبوب‌ترین” keeps search relevance; other sorts already applied.
    if (sort === "popular") {
      products.sort(
        (a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0),
      );
    }
  }

  const catalog = await getAllProductsAsync();
  const prices = catalog.map((p) => getDisplayPrice(p)).filter((n) => n > 0);
  const priceRange = {
    min: prices.length ? Math.min(...prices) : 0,
    max: prices.length ? Math.max(...prices) : 0,
  };

  return NextResponse.json({
    products,
    meta: {
      total: products.length,
      priceRange,
      categories: getAllCategories(),
      query: search ?? null,
    },
  });
}
