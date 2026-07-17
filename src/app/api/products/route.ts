import { NextResponse } from "next/server";
import {
  filterProductsAsync,
  getAllCategories,
  getAllProductsAsync,
} from "@/lib/server/products";
import { getMinPrice } from "@/lib/products";
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
  const search = searchParams.get("search") ?? undefined;

  let products = await filterProductsAsync({
    category: category ?? undefined,
    sort,
    minPrice,
    maxPrice,
    inStockOnly,
  });

  if (search) {
    const q = search.toLowerCase();
    products = products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q),
    );
  }

  const catalog = await getAllProductsAsync();
  const prices = catalog.map((p) => getMinPrice(p)).filter((n) => n > 0);
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
    },
  });
}
