/**
 * Process-local fallback when production has no Supabase and filesystem
 * writes are disabled. Suitable for single-instance / demo deploys.
 * Multi-instance hosts (e.g. Vercel) need Supabase for durable data.
 */

export interface MemorySession {
  id: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
  sellerId?: string;
  ipAddress?: string;
  userAgent?: string;
}

type MemoryRoot = {
  adminSessions: MemorySession[];
  sellerSessions: MemorySession[];
  sellers: Record<string, unknown>[];
  createdProducts: Record<string, unknown>[];
  stockOverrides: Record<string, boolean>;
  productOverrides: Record<string, Record<string, unknown>>;
  siteOverrides: Record<string, unknown> | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orders: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reviews: any[];
};

const globalKey = "__hajiasal_memory_store__";

function root(): MemoryRoot {
  const g = globalThis as unknown as Record<string, MemoryRoot | undefined>;
  if (!g[globalKey]) {
    g[globalKey] = {
      adminSessions: [],
      sellerSessions: [],
      sellers: [],
      createdProducts: [],
      stockOverrides: {},
      productOverrides: {},
      siteOverrides: null,
      orders: [],
      reviews: [],
    };
  }
  // Migrate older in-memory roots created before createdProducts existed.
  if (!Array.isArray(g[globalKey]!.createdProducts)) {
    g[globalKey]!.createdProducts = [];
  }
  return g[globalKey]!;
}

export function memoryGetAdminSessions(): MemorySession[] {
  return root().adminSessions;
}

export function memorySetAdminSessions(sessions: MemorySession[]): void {
  root().adminSessions = sessions;
}

export function memoryGetSellerSessions(): MemorySession[] {
  return root().sellerSessions;
}

export function memorySetSellerSessions(sessions: MemorySession[]): void {
  root().sellerSessions = sessions;
}

export function memoryGetSellers<T = Record<string, unknown>>(): T[] {
  return root().sellers as T[];
}

export function memorySetSellers(sellers: Record<string, unknown>[]): void {
  root().sellers = sellers;
}

export function memoryGetCreatedProducts<T = Record<string, unknown>>(): T[] {
  return root().createdProducts as T[];
}

export function memorySetCreatedProducts(
  products: Record<string, unknown>[],
): void {
  root().createdProducts = products;
}

export function memoryGetStockOverrides(): Record<string, boolean> {
  return { ...root().stockOverrides };
}

export function memorySetStockOverride(productId: string, inStock: boolean): void {
  root().stockOverrides[productId] = inStock;
}

export function memoryGetProductOverrides(): Record<string, Record<string, unknown>> {
  return { ...root().productOverrides };
}

export function memorySetProductOverride(
  productId: string,
  patch: Record<string, unknown>,
): void {
  root().productOverrides[productId] = {
    ...(root().productOverrides[productId] ?? {}),
    ...patch,
  };
}

export function memoryGetSiteOverrides(): Record<string, unknown> | null {
  return root().siteOverrides ? { ...root().siteOverrides } : null;
}

export function memorySetSiteOverrides(value: Record<string, unknown>): void {
  root().siteOverrides = value;
}

export function memoryGetOrders<T = unknown>(): T[] {
  return root().orders as T[];
}

export function memoryPushOrder(order: unknown): void {
  root().orders.unshift(order);
}

export function memoryUpdateOrder<T extends { id: string }>(
  orderId: string,
  patch: Partial<T>,
): T | null {
  const list = root().orders as T[];
  const idx = list.findIndex((o) => o.id === orderId);
  if (idx < 0) return null;
  const next = {
    ...list[idx]!,
    ...patch,
    updatedAt: new Date().toISOString(),
  } as T;
  list[idx] = next;
  return next;
}

export function memoryGetReviews<T = unknown>(): T[] {
  return root().reviews as T[];
}

export function memoryPushReview(review: unknown): void {
  root().reviews.unshift(review);
}

export function memorySetReviews(reviews: unknown[]): void {
  root().reviews = reviews;
}

export function memoryUpdateReview<T extends { id: string }>(
  id: string,
  patch: Partial<T>,
): T | null {
  const list = root().reviews as T[];
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const next = { ...list[idx]!, ...patch } as T;
  list[idx] = next;
  return next;
}
