import { NextResponse } from "next/server";
import {
  filterProductsAsync,
  getAllCategories,
  getAllProductsAsync,
  searchProductsAsync,
} from "@/lib/server/products";
import { getDisplayPrice } from "@/lib/products";
import { parseSortOption } from "@/lib/shop-catalog";
import type { Product, ProductCategory } from "@/types";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 48;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") as ProductCategory | null;
  const sort = parseSortOption(searchParams.get("sort"));
  const minPrice = searchParams.get("minPrice")
    ? Number(searchParams.get("minPrice"))
    : undefined;
  const maxPrice = searchParams.get("maxPrice")
    ? Number(searchParams.get("maxPrice"))
    : undefined;
  const inStockOnly = searchParams.get("inStock") === "1";
  const idsRaw = searchParams.get("ids")?.trim() ?? "";
  const search =
    searchParams.get("search")?.trim() ||
    searchParams.get("q")?.trim() ||
    undefined;

  if (idsRaw) {
    const wanted = idsRaw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 24);
    const catalog = await getAllProductsAsync();
    const byId = new Map(catalog.map((p) => [p.id, p]));
    let picked = wanted
      .map((id) => byId.get(id))
      .filter((p): p is Product => Boolean(p));
    if (inStockOnly) {
      picked = picked.filter((p) => p.inStock !== false);
    }
    const prices = catalog.map((p) => getDisplayPrice(p)).filter((n) => n > 0);
    return NextResponse.json({
      products: picked,
      meta: {
        total: picked.length,
        page: 1,
        limit: picked.length,
        hasMore: false,
        priceRange: {
          min: prices.length ? Math.min(...prices) : 0,
          max: prices.length ? Math.max(...prices) : 0,
        },
        categories: getAllCategories(),
        query: null,
      },
    });
  }

  const pageRaw = searchParams.get("page");
  const limitRaw = searchParams.get("limit");
  const paginate = pageRaw != null || limitRaw != null;
  const page = Math.max(1, Number(pageRaw) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(limitRaw) || DEFAULT_LIMIT),
  );

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

  const total = products.length;
  const pageProducts = paginate
    ? products.slice((page - 1) * limit, page * limit)
    : products;
  const hasMore = paginate ? page * limit < total : false;

  const catalog = await getAllProductsAsync();
  const prices = catalog.map((p) => getDisplayPrice(p)).filter((n) => n > 0);
  const priceRange = {
    min: prices.length ? Math.min(...prices) : 0,
    max: prices.length ? Math.max(...prices) : 0,
  };

  return NextResponse.json({
    products: pageProducts,
    meta: {
      total,
      page: paginate ? page : 1,
      limit: paginate ? limit : total,
      hasMore,
      priceRange,
      categories: getAllCategories(),
      query: search ?? null,
    },
  });
}
