import type { Product } from "@/types";
import { rankProductsForSearch } from "@/lib/search/product-ranking";
import { normalizeSearchText } from "@/lib/search/text";
import { getAllProductsAsync } from "@/lib/server/products-store";

const MAX_QUERY_LEN = 80;
const CACHE_TTL_MS = 45_000;
const CACHE_MAX = 128;

type CacheEntry = { at: number; results: Product[]; total: number };

const cache = new Map<string, CacheEntry>();

function pruneCache() {
  if (cache.size <= CACHE_MAX) return;
  const oldest = [...cache.entries()]
    .sort((a, b) => a[1].at - b[1].at)
    .slice(0, cache.size - CACHE_MAX);
  for (const [key] of oldest) cache.delete(key);
}

export function sanitizeSearchQuery(raw: string): string {
  return normalizeSearchText(raw.trim().slice(0, MAX_QUERY_LEN));
}

export async function searchPublicProductsAsync(
  rawQuery: string,
  limit = 12,
): Promise<{ results: Product[]; total: number; query: string }> {
  const query = sanitizeSearchQuery(rawQuery);
  if (!query) {
    return { results: [], total: 0, query: "" };
  }

  const boundedLimit = Math.min(Math.max(limit, 1), 24);
  const cacheKey = `${query}:${boundedLimit}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return { results: hit.results, total: hit.total, query };
  }

  const catalog = await getAllProductsAsync();
  const ranked = rankProductsForSearch(catalog, query);
  const results = ranked.slice(0, boundedLimit).map((r) => r.product);
  const total = ranked.length;

  cache.set(cacheKey, { at: Date.now(), results, total });
  pruneCache();

  return { results, total, query };
}
