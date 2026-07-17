import type { Product, ProductCategory, ProductFilters, SortOption } from "@/types";
import {
  filterProducts,
  getAllCategories,
  getPriceRange,
  getAllProducts,
  getProductBySlug,
  getBestsellers,
  searchProducts as searchProductsSync,
} from "@/lib/products";
import {
  getAllProductsAsync,
  getProductBySlugAsync,
  filterProductsAsync,
  getBestsellersAsync,
  searchProductsAsync,
  updateProductAsync,
  createProductAsync,
  deleteProductAsync,
  getProductByIdAsync,
} from "./products-store";

export {
  getAllProductsAsync,
  getProductBySlugAsync,
  getProductByIdAsync,
  filterProductsAsync,
  getBestsellersAsync,
  searchProductsAsync,
  updateProductAsync,
  createProductAsync,
  deleteProductAsync,
  isProductsDbEnabled,
} from "./products-store";

export function getProductsFromDb(filters?: ProductFilters): Product[] {
  if (!filters) return getAllProducts();
  return filterProducts(filters);
}

/** Prefer async helpers so admin/seller stock overrides apply. */
export async function getProductsFromDbAsync(
  filters?: ProductFilters,
): Promise<Product[]> {
  if (!filters) return getAllProductsAsync();
  return filterProductsAsync(filters);
}

export function getProductFromDb(slug: string): Product | undefined {
  return getProductBySlug(slug);
}

export async function getProductFromDbAsync(
  slug: string,
): Promise<Product | undefined> {
  return getProductBySlugAsync(slug);
}

export function searchProducts(query: string): Product[] {
  return searchProductsSync(query);
}

export { getBestsellers, getPriceRange, getAllCategories };

export type { ProductCategory, SortOption, ProductFilters };
