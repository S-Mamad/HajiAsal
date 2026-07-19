import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import type { RowDataPacket } from "mysql2/promise";
import catalogData from "@/data/seller-catalog.json";
import { readJsonFile, writeJsonFile } from "./db";
import {
  memoryGetSellerSessions,
  memoryGetStockOverrides,
  memorySetSellerSessions,
  memorySetStockOverride,
} from "./memory-store";
import { canUseFilesystemPersistence, isProduction } from "./production";
import {
  getAllProductsAsync,
  updateProductAsync,
  type ProductListScope,
} from "./products-store";
import { getAllOrders, type StoredOrder } from "./orders";
import { isMysqlConfigured, mysqlExecute, mysqlQuery, mysqlQueryOne, toIso } from "./mysql";
import type { Product } from "@/types";
import {
  getAllSellersSync,
  getSellerByIdAsync,
  getSellerByIdSync,
  getSellerByPhoneSync,
  type Seller,
} from "./sellers-store";

export type {
  PublicSeller,
  Seller,
  SellerStatus,
  SellerCreateInput,
  SellerUpdateInput,
} from "./sellers-store";

export {
  hashSellerPassword,
  toPublicSeller,
  getAllSellersAsync,
  getSellerByIdAsync,
  getSellerByPhoneAsync,
  createSellerAsync,
  updateSellerAsync,
  deleteSellerAsync,
  getActiveSellerIdsAsync,
} from "./sellers-store";

export const SELLER_COOKIE = "hajiasal_seller_session";
const SESSIONS_FILE = "seller-sessions.json";
const SESSION_DAYS = 7;

/** Known leaked SHA-256 hashes (e.g. documented seller123) — always reject. */
const COMPROMISED_PASSWORD_HASHES = new Set([
  "2a76110d06bcc4fd437337b984131cfa82db9f792e3e2340acef9f3066b264e0",
]);

const legacyCatalog = catalogData as Record<string, string[]>;

export type SellerOrderView = {
  id: string;
  status: StoredOrder["status"];
  paymentMethod: StoredOrder["paymentMethod"];
  customer: {
    fullName: string;
    phone: string;
    city: string;
    address: string;
  };
  sellerItems: StoredOrder["items"];
  sellerSubtotal: number;
  shippingMethod?: string;
  trackingCode?: string;
  createdAt: string;
  updatedAt: string;
  /** True when every line item in the parent order belongs to this seller. */
  soleOwner: boolean;
};

export interface SellerSession {
  id: string;
  sellerId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function safeEqualString(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length, 1);
  const left = Buffer.alloc(maxLen);
  const right = Buffer.alloc(maxLen);
  Buffer.from(a).copy(left);
  Buffer.from(b).copy(right);
  try {
    return timingSafeEqual(left, right) && a.length === b.length;
  } catch {
    return false;
  }
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

function verifyScryptPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, expected] = parts;
  if (!salt || !expected) return false;
  try {
    const derived = scryptSync(password, salt, 64, {
      N: 16384,
      r: 8,
      p: 1,
    }).toString("base64url");
    return safeEqualString(derived, expected);
  } catch {
    return false;
  }
}

function verifyLegacySha256Password(
  password: string,
  stored: string,
): boolean {
  if (COMPROMISED_PASSWORD_HASHES.has(stored)) return false;
  const digest = createHash("sha256").update(password).digest("hex");
  return safeEqualHex(digest, stored);
}

function verifyStoredPasswordHash(
  password: string,
  stored: string,
): boolean {
  if (stored.startsWith("scrypt$")) {
    return verifyScryptPassword(password, stored);
  }
  return verifyLegacySha256Password(password, stored);
}

/** @deprecated Prefer getAllSellersAsync — seed-only sync fallback */
export function getAllSellers(): Seller[] {
  return getAllSellersSync();
}

/** @deprecated Prefer getSellerByIdAsync */
export function getSellerById(id: string): Seller | null {
  return getSellerByIdSync(id);
}

/** @deprecated Prefer getSellerByPhoneAsync */
export function getSellerByPhone(phone: string): Seller | null {
  return getSellerByPhoneSync(phone);
}

export function verifySellerPassword(seller: Seller, password: string): boolean {
  if (!password || password.length < 4) return false;

  const envKey = `SELLER_PASSWORD_${seller.id.toUpperCase()}`;
  const envPassword =
    process.env[envKey] ?? process.env.SELLER_PASSWORD ?? "";
  if (envPassword) {
    return safeEqualString(password, envPassword);
  }

  if (isProduction() && seller.isDemo) {
    return false;
  }

  const demo = process.env.SELLER_DEMO_PASSWORD;
  if (demo && !isProduction() && safeEqualString(password, demo)) {
    return true;
  }

  return verifyStoredPasswordHash(password, seller.passwordHash);
}

/** Legacy catalog assignment (demo fallback only). */
export function getSellerProductIds(sellerId: string): string[] {
  return legacyCatalog[sellerId] ?? [];
}

export async function setSellerProductStock(
  sellerId: string,
  productId: string,
  inStock: boolean,
): Promise<Product | null> {
  const products = await getSellerProducts(sellerId);
  const product = products.find((p) => p.id === productId);
  if (!product) return null;

  // Owned seller products: update the product row itself.
  // Catalog assignments: only seller-scoped stock overrides (never mutate global catalog).
  if (product.sellerId === sellerId) {
    try {
      const updated = await updateProductAsync(productId, { inStock });
      if (updated) return updated;
    } catch {
      // fall through to local override
    }
  }

  if (canUseFilesystemPersistence()) {
    const overrides = await readJsonFile<Record<string, boolean>>(
      "seller-stock-overrides.json",
      {},
    );
    overrides[productId] = inStock;
    await writeJsonFile("seller-stock-overrides.json", overrides);
    return { ...product, inStock };
  }

  memorySetStockOverride(productId, inStock);
  return { ...product, inStock };
}

async function applyStockOverrides(products: Product[]): Promise<Product[]> {
  let overrides: Record<string, boolean> = {};
  if (canUseFilesystemPersistence()) {
    overrides = await readJsonFile<Record<string, boolean>>(
      "seller-stock-overrides.json",
      {},
    );
  } else {
    overrides = memoryGetStockOverrides();
  }
  return products.map((p) =>
    p.id in overrides ? { ...p, inStock: overrides[p.id]! } : p,
  );
}

/**
 * Products owned by the seller (seller_id), unioned with legacy catalog
 * assignments so creating a first owned product does not hide demo SKUs.
 */
export async function getSellerProducts(sellerId: string): Promise<Product[]> {
  const owned = await getAllProductsAsync({
    scope: "seller",
    sellerId,
  } satisfies ProductListScope);

  const ids = new Set(getSellerProductIds(sellerId));
  let assigned: Product[] = [];
  if (ids.size > 0) {
    const all = await getAllProductsAsync({ scope: "admin" });
    assigned = all.filter((p) => ids.has(p.id) && !p.sellerId);
  }

  const byId = new Map<string, Product>();
  for (const p of assigned) byId.set(p.id, p);
  for (const p of owned) byId.set(p.id, p);
  return applyStockOverrides(Array.from(byId.values()));
}

export async function getSellerOrders(
  sellerId: string,
): Promise<SellerOrderView[]> {
  const products = await getSellerProducts(sellerId);
  const ids = new Set(products.map((p) => p.id));
  const orders = await getAllOrders();
  const views: SellerOrderView[] = [];

  for (const order of orders) {
    const sellerItems = order.items.filter((i) => ids.has(i.productId));
    if (sellerItems.length === 0) continue;
    const sellerSubtotal = sellerItems.reduce(
      (sum, i) => sum + i.weight.price * i.quantity,
      0,
    );
    views.push({
      id: order.id,
      status: order.status,
      paymentMethod: order.paymentMethod,
      customer: {
        fullName: order.customer.fullName,
        phone: order.customer.phone,
        city: order.customer.city,
        address: order.customer.address,
      },
      sellerItems,
      sellerSubtotal,
      shippingMethod: order.shippingMethod,
      trackingCode: order.trackingCode,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      soleOwner: sellerItems.length === order.items.length,
    });
  }

  return views;
}

async function readSessions(): Promise<SellerSession[]> {
  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        "SELECT * FROM seller_sessions WHERE revoked_at IS NULL",
      );
      return rows.map((row) => ({
        id: String(row.id),
        sellerId: String(row.seller_id),
        tokenHash: String(row.token_hash),
        createdAt: toIso(row.created_at),
        expiresAt: toIso(row.expires_at),
        revokedAt: row.revoked_at ? toIso(row.revoked_at) : undefined,
      }));
    } catch (error) {
      console.error(
        "[seller-sessions] fetch failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  if (canUseFilesystemPersistence()) {
    return readJsonFile<SellerSession[]>(SESSIONS_FILE, []);
  }
  return memoryGetSellerSessions().map((s) => ({
    id: s.id,
    sellerId: s.sellerId ?? "",
    tokenHash: s.tokenHash,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    revokedAt: s.revokedAt,
  }));
}

async function writeSessions(sessions: SellerSession[]): Promise<void> {
  if (canUseFilesystemPersistence()) {
    await writeJsonFile(SESSIONS_FILE, sessions);
    return;
  }
  memorySetSellerSessions(
    sessions.map((s) => ({
      id: s.id,
      sellerId: s.sellerId,
      tokenHash: s.tokenHash,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      revokedAt: s.revokedAt,
    })),
  );
}

export async function createSellerSession(
  sellerId: string,
): Promise<{ token: string } | null> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  );
  const session: SellerSession = {
    id: randomUUID(),
    sellerId,
    tokenHash: hashToken(token),
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  if (isMysqlConfigured()) {
    try {
      await mysqlExecute(
        "INSERT INTO seller_sessions (id, seller_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
        [session.id, sellerId, session.tokenHash, session.createdAt, session.expiresAt],
      );
      return { token };
    } catch (error) {
      console.error(
        "[seller-sessions] insert failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  const sessions = await readSessions();
  sessions.push(session);
  await writeSessions(sessions);
  return { token };
}

export async function validateSellerSessionToken(
  token: string,
): Promise<Seller | null> {
  if (!token) return null;
  const tokenHash = hashToken(token);

  if (isMysqlConfigured()) {
    try {
      const row = await mysqlQueryOne<RowDataPacket>(
        "SELECT * FROM seller_sessions WHERE token_hash = ? AND revoked_at IS NULL LIMIT 1",
        [tokenHash],
      );
      if (row) {
        if (new Date(toIso(row.expires_at)).getTime() < Date.now()) return null;
        const seller = await getSellerByIdAsync(String(row.seller_id));
        if (!seller || seller.status !== "active") return null;
        return seller;
      }
    } catch (error) {
      console.error(
        "[seller-sessions] validate failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  const sessions = await readSessions();
  const session = sessions.find(
    (s) =>
      s.tokenHash === tokenHash &&
      !s.revokedAt &&
      new Date(s.expiresAt).getTime() > Date.now(),
  );
  if (!session) return null;
  const seller = await getSellerByIdAsync(session.sellerId);
  if (!seller || seller.status !== "active") return null;
  return seller;
}

export async function revokeSellerSession(token: string): Promise<void> {
  const tokenHash = hashToken(token);

  if (isMysqlConfigured()) {
    try {
      await mysqlExecute(
        "UPDATE seller_sessions SET revoked_at = ? WHERE token_hash = ?",
        [new Date().toISOString(), tokenHash],
      );
    } catch (error) {
      console.error(
        "[seller-sessions] revoke failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  const sessions = await readSessions();
  const next = sessions.map((s) =>
    s.tokenHash === tokenHash
      ? { ...s, revokedAt: new Date().toISOString() }
      : s,
  );
  await writeSessions(next);
}

function getTokenFromCookieHeader(cookieHeader: string): string | null {
  const match = cookieHeader.match(new RegExp(`${SELLER_COOKIE}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export async function getSellerFromRequest(
  request: Request,
): Promise<Seller | null> {
  const token = getTokenFromCookieHeader(request.headers.get("cookie") ?? "");
  if (!token) return null;
  return validateSellerSessionToken(token);
}

export async function getSellerFromCookies(): Promise<Seller | null> {
  const store = await cookies();
  const token = store.get(SELLER_COOKIE)?.value;
  if (!token) return null;
  return validateSellerSessionToken(token);
}

export function sellerCookieOptions(token: string) {
  return {
    name: SELLER_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export async function buildSellerDashboard(sellerId: string) {
  const [products, orders] = await Promise.all([
    getSellerProducts(sellerId),
    getSellerOrders(sellerId),
  ]);

  const { getSellerWalletBalance } = await import("./seller-wallet");
  const { listSellerNotifications } = await import("./seller-notifications");
  const { isMysqlConfigured, mysqlQuery } = await import("./mysql");

  const now = Date.now();
  const dayMs = 86400000;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayTs = startOfToday.getTime();

  const activeOrders = orders.filter((o) => o.status !== "cancelled");
  const sumInRange = (from: number) =>
    activeOrders
      .filter((o) => new Date(o.createdAt).getTime() >= from)
      .reduce((s, o) => s + o.sellerSubtotal, 0);

  const salesToday = sumInRange(todayTs);
  const salesWeek = sumInRange(now - 7 * dayMs);
  const salesMonth = sumInRange(now - 30 * dayMs);
  const revenueTotal = activeOrders.reduce((s, o) => s + o.sellerSubtotal, 0);

  const pending = orders.filter(
    (o) =>
      o.status === "pending_payment" ||
      o.status === "confirmed" ||
      o.status === "processing",
  );
  const pendingProducts = products.filter(
    (p) => p.approvalStatus === "pending",
  );
  const lowStockCount = products.filter((p) => {
    const qty = p.stockQty ?? (p.inStock ? 1 : 0);
    return qty <= 10;
  }).length;
  const outOfStock = products.filter((p) => !p.inStock);

  const salesByDay: { date: string; amount: number }[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(todayTs - i * dayMs);
    const key = d.toISOString().slice(0, 10);
    const amount = activeOrders
      .filter((o) => o.createdAt.slice(0, 10) === key)
      .reduce((s, o) => s + o.sellerSubtotal, 0);
    salesByDay.push({ date: key, amount });
  }

  let walletAvailable = 0;
  let walletPending = 0;
  try {
    const bal = await getSellerWalletBalance(sellerId);
    walletAvailable = bal.available;
    walletPending = bal.pending;
  } catch {
    /* ignore */
  }

  let recentNotifications: Array<{
    id: string;
    title: string;
    createdAt: string;
  }> = [];
  try {
    const n = await listSellerNotifications({ sellerId, limit: 5 });
    recentNotifications = n.rows.map((r) => ({
      id: r.id,
      title: r.title,
      createdAt: r.createdAt,
    }));
  } catch {
    /* ignore */
  }

  let recentTickets: Array<{
    id: string;
    subject: string;
    status: string;
    updatedAt: string;
  }> = [];
  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<{
        id: string;
        subject: string;
        status: string;
        updated_at: unknown;
      } & import("mysql2/promise").RowDataPacket>(
        `SELECT id, subject, status, updated_at FROM seller_tickets
         WHERE seller_id = ? ORDER BY updated_at DESC LIMIT 5`,
        [sellerId],
      );
      recentTickets = rows.map((r) => ({
        id: String(r.id),
        subject: String(r.subject),
        status: String(r.status),
        updatedAt: String(r.updated_at),
      }));
    } catch {
      /* ignore */
    }
  }

  return {
    kpis: {
      productCount: products.length,
      pendingProducts: pendingProducts.length,
      outOfStock: outOfStock.length,
      lowStockCount,
      orderCount: orders.length,
      pendingOrders: pending.length,
      revenue: revenueTotal,
      salesToday,
      salesWeek,
      salesMonth,
      revenueTotal,
      walletAvailable,
      walletPending,
    },
    salesByDay,
    recentOrders: orders.slice(0, 8),
    recentTickets,
    recentNotifications,
    products: products.slice(0, 6),
  };
}
