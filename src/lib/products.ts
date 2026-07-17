import productsData from "@/data/products.json";
import type { Product, ProductCategory, ProductFilters, SortOption } from "@/types";

const products = productsData as Product[];

export function getAllProducts(): Product[] {
  return products;
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function getBestsellers(limit = 8): Product[] {
  return products.filter((p) => p.isBestseller && p.inStock).slice(0, limit);
}

export function getNewProducts(limit = 6): Product[] {
  return products.filter((p) => p.isNew && p.inStock).slice(0, limit);
}

export function getProductsByCategory(category: ProductCategory): Product[] {
  return products.filter((p) => p.category === category);
}

export function getMinPrice(product: Product): number {
  const prices = product.weightOptions?.map((w) => w.price) ?? [];
  if (prices.length === 0) return 0;
  return Math.min(...prices);
}

/** Sale price charged for a weight when product.discountPrice is set. */
export function getEffectiveWeightPrice(
  product: Pick<Product, "weightOptions" | "discountPrice">,
  weight: { price: number },
): number {
  const prices = product.weightOptions?.map((w) => w.price) ?? [];
  if (prices.length === 0) return weight.price;
  const min = Math.min(...prices);
  if (
    typeof product.discountPrice === "number" &&
    product.discountPrice > 0 &&
    product.discountPrice < min &&
    min > 0
  ) {
    return Math.round(weight.price * (product.discountPrice / min));
  }
  return weight.price;
}

export function getDisplayPrice(product: Product): number {
  const min = getMinPrice(product);
  if (
    typeof product.discountPrice === "number" &&
    product.discountPrice > 0 &&
    product.discountPrice < min
  ) {
    return product.discountPrice;
  }
  return min;
}

export function getMaxPrice(product: Product): number {
  const prices = product.weightOptions?.map((w) => w.price) ?? [];
  if (prices.length === 0) return 0;
  return Math.max(...prices);
}

export function getAllCategories(): ProductCategory[] {
  const cats = new Set(products.map((p) => p.category));
  return Array.from(cats);
}

export function getPriceRange(): { min: number; max: number } {
  const prices = products.flatMap((p) => p.weightOptions.map((w) => w.price));
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

function sortProducts(items: Product[], sort: SortOption): Product[] {
  const sorted = [...items];
  switch (sort) {
    case "price-asc":
      return sorted.sort((a, b) => getMinPrice(a) - getMinPrice(b));
    case "price-desc":
      return sorted.sort((a, b) => getMinPrice(b) - getMinPrice(a));
    case "newest":
      return sorted.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
    case "popular":
    default:
      return sorted.sort((a, b) => b.reviewCount - a.reviewCount);
  }
}

export function filterProducts(
  filters: ProductFilters,
  catalog?: Product[],
): Product[] {
  let result = [...(catalog ?? products)];

  if (filters.category) {
    result = result.filter((p) => p.category === filters.category);
  }

  if (filters.inStockOnly) {
    result = result.filter((p) => p.inStock);
  }

  if (filters.minPrice !== undefined) {
    result = result.filter((p) => getMinPrice(p) >= filters.minPrice!);
  }

  if (filters.maxPrice !== undefined) {
    result = result.filter((p) => getMinPrice(p) <= filters.maxPrice!);
  }

  return sortProducts(result, filters.sort ?? "popular");
}

export function getRelatedProducts(slug: string, limit = 4): Product[] {
  const product = getProductBySlug(slug);
  if (!product) return [];
  return products
    .filter(
      (p) =>
        p.category === product.category &&
        p.slug !== slug &&
        p.inStock,
    )
    .slice(0, limit);
}

export function getAllSlugs(): string[] {
  return products.map((p) => p.slug);
}

export function searchProducts(query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return products.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q) ||
      p.categoryLabel.toLowerCase().includes(q) ||
      p.shortDescription.toLowerCase().includes(q),
  );
}
