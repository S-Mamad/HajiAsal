import type { Product } from "@/types";
import { normalizeSearchText, splitSearchTokens } from "@/lib/search/text";

function tokenFieldScore(field: string, token: string): number {
  if (!field) return 0;
  if (field === token) return 100;
  if (field.startsWith(token)) return 80;
  if (field.includes(token)) return 60;
  return 0;
}

function buildSearchHaystack(product: Product): {
  title: string;
  slug: string;
  category: string;
  sku: string;
  body: string;
} {
  const seo = product.seo;
  const faqText =
    seo?.faq?.map((f) => `${f.question} ${f.answer}`).join(" ") ?? "";
  return {
    title: normalizeSearchText(product.title),
    slug: normalizeSearchText(product.slug),
    category: normalizeSearchText(
      `${product.categoryLabel} ${product.category}`,
    ),
    sku: normalizeSearchText(product.sku ?? ""),
    body: normalizeSearchText(
      [
        product.shortDescription,
        product.longDescription,
        product.ingredients,
        product.shippingInfo,
        seo?.title,
        seo?.description,
        seo?.focusKeyword,
        seo?.ogTitle,
        seo?.ogDescription,
        faqText,
      ]
        .filter(Boolean)
        .join(" "),
    ),
  };
}

export function scoreProductSearch(product: Product, query: string): number {
  const tokens = splitSearchTokens(query);
  if (!tokens.length) return 0;

  const fields = buildSearchHaystack(product);
  let total = 0;

  for (const token of tokens) {
    let tokenScore = 0;
    const titleScore = tokenFieldScore(fields.title, token);
    if (titleScore) tokenScore = Math.max(tokenScore, titleScore);
    if (fields.slug.includes(token)) tokenScore = Math.max(tokenScore, 40);
    if (fields.category.includes(token)) tokenScore = Math.max(tokenScore, 35);
    if (fields.sku && fields.sku.includes(token)) {
      tokenScore = Math.max(tokenScore, 55);
    }
    if (fields.body.includes(token)) tokenScore = Math.max(tokenScore, 15);
    if (!tokenScore) return 0;
    total += tokenScore;
  }

  if (product.isBestseller) total += 4;
  if (product.inStock) total += 2;

  return total;
}

export type RankedProduct = { product: Product; score: number };

export function rankProductsForSearch(
  catalog: Product[],
  query: string,
): RankedProduct[] {
  const tokens = splitSearchTokens(query);
  if (!tokens.length) return [];

  return catalog
    .map((product) => ({
      product,
      score: scoreProductSearch(product, query),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.product.inStock !== b.product.inStock) {
        return a.product.inStock ? -1 : 1;
      }
      const aBest = a.product.isBestseller ? 1 : 0;
      const bBest = b.product.isBestseller ? 1 : 0;
      if (bBest !== aBest) return bBest - aBest;
      return b.product.reviewCount - a.product.reviewCount;
    });
}
