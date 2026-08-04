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
  return products
    .filter((p) => p.isBestseller && p.inStock)
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, limit);
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

/** Normalize Arabic/Persian yeh/kaf so search matches typed variants. */
export function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک");
}

export function scoreProductSearch(product: Product, normalizedQuery: string): number {
  if (!normalizedQuery) return 0;
  const title = normalizeSearchText(product.title);
  const slug = product.slug.toLowerCase();
  const category = normalizeSearchText(
    `${product.categoryLabel} ${product.category}`,
  );
  const body = normalizeSearchText(
    `${product.shortDescription} ${product.longDescription}`,
  );
  let score = 0;
  if (title === normalizedQuery) score += 100;
  else if (title.startsWith(normalizedQuery)) score += 80;
  else if (title.includes(normalizedQuery)) score += 60;
  if (slug.includes(normalizedQuery)) score += 40;
  if (category.includes(normalizedQuery)) score += 30;
  if (body.includes(normalizedQuery)) score += 10;
  return score;
}

function productRecencyTs(product: Product): number {
  const raw = product.publishedAt ?? product.createdAt;
  if (!raw) return 0;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : 0;
}

function sortProducts(items: Product[], sort: SortOption): Product[] {
  const sorted = [...items];
  switch (sort) {
    case "price-asc":
      return sorted.sort((a, b) => getDisplayPrice(a) - getDisplayPrice(b));
    case "price-desc":
      return sorted.sort((a, b) => getDisplayPrice(b) - getDisplayPrice(a));
    case "newest":
      return sorted.sort((a, b) => {
        const byDate = productRecencyTs(b) - productRecencyTs(a);
        if (byDate !== 0) return byDate;
        return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
      });
    case "popular":
    default:
      return sorted.sort((a, b) => {
        const byReviews = b.reviewCount - a.reviewCount;
        if (byReviews !== 0) return byReviews;
        return (b.isBestseller ? 1 : 0) - (a.isBestseller ? 1 : 0);
      });
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
    result = result.filter((p) => getDisplayPrice(p) >= filters.minPrice!);
  }

  if (filters.maxPrice !== undefined) {
    result = result.filter((p) => getDisplayPrice(p) <= filters.maxPrice!);
  }

  return sortProducts(result, filters.sort ?? "popular");
}

export function getRelatedProducts(slug: string, limit = 8): Product[] {
  const product = getProductBySlug(slug);
  if (!product) return [];
  return products
    .filter(
      (p) =>
        p.category === product.category &&
        p.slug !== slug &&
        p.inStock,
    )
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, limit);
}

export function getAllSlugs(): string[] {
  return products.map((p) => p.slug);
}

export function searchProducts(query: string, catalog?: Product[]): Product[] {
  const q = normalizeSearchText(query);
  if (!q) return [];
  return (catalog ?? products)
    .map((p) => ({ p, score: scoreProductSearch(p, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);
}
