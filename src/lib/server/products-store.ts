import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2/promise";
import productsData from "@/data/products.json";
import type {
  AmazingDealsSort,
  Product,
  ProductApprovalStatus,
  ProductCategory,
  ProductFilters,
  ProductRevision,
  ProductSeo,
  ProductStatus,
  WeightOption,
} from "@/types";
import {
  getDiscountPercent,
  isProductOnSale,
  isSellableCatalogProduct,
} from "@/lib/product-eligibility";
import {
  filterProducts as filterProductsSync,
  getAllProducts as getAllProductsSync,
  getProductBySlug as getProductBySlugSync,
  getBestsellers as getBestsellersSync,
  getAllSlugs as getAllSlugsSync,
  searchProducts as searchProductsSync,
} from "@/lib/products";
import { readJsonFile, writeJsonFile } from "./db";
import {
  memoryGetProductOverrides,
  memoryGetStockOverrides,
  memoryGetCreatedProducts,
  memorySetCreatedProducts,
  memorySetProductOverride,
  memorySetStockOverride,
} from "./memory-store";
import { canUseFilesystemPersistence } from "./production";
import {
  asJson,
  isMysqlConfigured,
  mysqlExecute,
  mysqlQuery,
  mysqlQueryOne,
  parseJsonField,
  toBool,
  toIso,
} from "./mysql";
import { revalidatePath } from "next/cache";
import { getActiveSellerIdsAsync } from "./sellers-store";
import { parseImageFits, pruneImageFits } from "@/lib/product-image";
import {
  applyStockUpdates,
  stockDefaultsForCreate,
  syncStockFields,
} from "./product-stock-sync";

const staticProducts = productsData as Product[];
const PRODUCT_OVERRIDES_FILE = "product-overrides.json";
const STOCK_OVERRIDES_FILE = "seller-stock-overrides.json";
const PRODUCTS_RUNTIME_FILE = "products-runtime.json";
const REVISIONS_FILE = "product-revisions.json";

export type ProductListScope =
  | { scope?: "public" }
  | { scope: "admin" }
  | { scope: "seller"; sellerId: string };

export type AdminProductListOptions = ProductListScope & {
  includeTrash?: boolean;
  status?: ProductStatus | "all";
  approvalStatus?: ProductApprovalStatus | "all" | "awaiting";
};

const categoryLabels: Record<string, string> = {};
for (const p of staticProducts) {
  categoryLabels[p.category] = p.categoryLabel;
}

function mapRowToProduct(row: Record<string, unknown>): Product {
  const honeyMeta = parseJsonField<Record<string, unknown>>(row.honey_meta, {});
  const categoryId = row.category_id as ProductCategory;
  const approval = (row.approval_status as ProductApprovalStatus) ?? "approved";
  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    shortDescription: (row.short_description as string) ?? "",
    longDescription: (row.description as string) ?? "",
    category: categoryId,
    categoryLabel:
      (honeyMeta.categoryLabel as string) ||
      categoryLabels[categoryId] ||
      categoryId,
    images: parseJsonField<string[]>(row.images, []),
    imageFits: parseImageFits(honeyMeta.imageFits),
    weightOptions: parseJsonField<WeightOption[]>(row.weight_options, []),
    discountPrice: row.discount_price
      ? Number(row.discount_price)
      : undefined,
    inStock: toBool(row.in_stock),
    // null stock_qty = unlimited; never invent a quantity on read
    stockQty: row.stock_qty != null ? Number(row.stock_qty) : undefined,
    status: (row.status as ProductStatus) ?? "active",
    sku: row.sku ? String(row.sku) : undefined,
    brandId: row.brand_id ? String(row.brand_id) : null,
    rating: Number(row.rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    viewsLast24h:
      typeof honeyMeta.viewsLast24h === "number"
        ? honeyMeta.viewsLast24h
        : undefined,
    isBestseller: toBool(row.bestseller),
    isNew: toBool(row.featured),
    ingredients: (honeyMeta.ingredients as string) ?? undefined,
    shippingInfo: (honeyMeta.shippingInfo as string) ?? undefined,
    createdAt: row.created_at ? toIso(row.created_at) : undefined,
    sellerId: row.seller_id ? String(row.seller_id) : undefined,
    approvalStatus: approval,
    reviewNote: row.review_note ? String(row.review_note) : undefined,
    submittedAt: row.submitted_at ? toIso(row.submitted_at) : undefined,
    reviewedAt: row.reviewed_at ? toIso(row.reviewed_at) : undefined,
    deletedAt: row.deleted_at ? toIso(row.deleted_at) : null,
    publishedAt: row.published_at ? toIso(row.published_at) : null,
    seo: parseJsonField<ProductSeo | undefined>(row.seo, undefined),
    customFields: parseJsonField<Record<string, unknown>>(
      row.custom_fields,
      {},
    ),
  };
}

function mapProductToRow(
  product: Partial<Product> & { id: string; slug: string; title: string },
) {
  const imageFits = pruneImageFits(product.imageFits, product.images ?? []);
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    short_description: product.shortDescription ?? "",
    description: product.longDescription ?? "",
    category_id: product.category,
    images: product.images ?? [],
    weight_options: product.weightOptions ?? [],
    discount_price: product.discountPrice ?? null,
    in_stock: product.inStock ?? true,
    featured: product.isNew ?? false,
    bestseller: product.isBestseller ?? false,
    rating: product.rating ?? 0,
    review_count: product.reviewCount ?? 0,
    seo: product.seo ?? null,
    custom_fields: product.customFields ?? {},
    honey_meta: {
      ingredients: product.ingredients,
      shippingInfo: product.shippingInfo,
      categoryLabel: product.categoryLabel,
      ...(typeof product.viewsLast24h === "number"
        ? { viewsLast24h: product.viewsLast24h }
        : {}),
      ...(imageFits ? { imageFits } : {}),
    },
    seller_id: product.sellerId ?? null,
    approval_status: product.approvalStatus ?? "approved",
    review_note: product.reviewNote ?? null,
    submitted_at: product.submittedAt ?? null,
    reviewed_at: product.reviewedAt ?? null,
    deleted_at: product.deletedAt ?? null,
    published_at: product.publishedAt ?? null,
    status: product.status ?? "active",
    stock_qty:
      typeof product.stockQty === "number"
        ? product.stockQty
        : product.inStock === false
          ? 0
          : null,
    sku: product.sku ?? null,
    brand_id: product.brandId ?? null,
    updated_at: new Date().toISOString(),
  };
}

type ProductRow = ReturnType<typeof mapProductToRow>;

function productRowParamsLegacy(row: ProductRow): unknown[] {
  return [
    row.id,
    row.slug,
    row.title,
    row.short_description,
    row.description,
    row.category_id,
    asJson(row.images),
    asJson(row.weight_options),
    row.discount_price,
    row.in_stock,
    row.featured,
    row.bestseller,
    row.rating,
    row.review_count,
    asJson(row.honey_meta),
    row.seller_id,
    row.approval_status,
    row.review_note,
    row.submitted_at,
    row.reviewed_at,
    row.updated_at,
  ];
}

const PRODUCT_UPSERT_SQL_LEGACY = `INSERT INTO products (
    id, slug, title, short_description, description, category_id, images, weight_options,
    discount_price, in_stock, featured, bestseller, rating, review_count, honey_meta,
    seller_id, approval_status, review_note, submitted_at, reviewed_at, updated_at, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    slug = VALUES(slug), title = VALUES(title), short_description = VALUES(short_description),
    description = VALUES(description), category_id = VALUES(category_id), images = VALUES(images),
    weight_options = VALUES(weight_options), discount_price = VALUES(discount_price),
    in_stock = VALUES(in_stock), featured = VALUES(featured), bestseller = VALUES(bestseller),
    rating = VALUES(rating), review_count = VALUES(review_count), honey_meta = VALUES(honey_meta),
    seller_id = VALUES(seller_id), approval_status = VALUES(approval_status),
    review_note = VALUES(review_note), submitted_at = VALUES(submitted_at),
    reviewed_at = VALUES(reviewed_at), updated_at = VALUES(updated_at)`;

async function upsertProductRow(row: ProductRow, createdAt: string): Promise<void> {
  try {
    await mysqlExecute(
      `INSERT INTO products (
        id, slug, title, short_description, description, category_id, images, weight_options,
        discount_price, in_stock, featured, bestseller, rating, review_count, seo, custom_fields, honey_meta,
        seller_id, approval_status, review_note, submitted_at, reviewed_at, deleted_at, published_at,
        status, stock_qty, sku, brand_id, updated_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        slug = VALUES(slug), title = VALUES(title), short_description = VALUES(short_description),
        description = VALUES(description), category_id = VALUES(category_id), images = VALUES(images),
        weight_options = VALUES(weight_options), discount_price = VALUES(discount_price),
        in_stock = VALUES(in_stock), featured = VALUES(featured), bestseller = VALUES(bestseller),
        rating = VALUES(rating), review_count = VALUES(review_count), seo = VALUES(seo),
        custom_fields = VALUES(custom_fields), honey_meta = VALUES(honey_meta),
        seller_id = VALUES(seller_id), approval_status = VALUES(approval_status),
        review_note = VALUES(review_note), submitted_at = VALUES(submitted_at),
        reviewed_at = VALUES(reviewed_at), deleted_at = VALUES(deleted_at),
        published_at = VALUES(published_at), status = VALUES(status), stock_qty = VALUES(stock_qty),
        sku = VALUES(sku), brand_id = VALUES(brand_id), updated_at = VALUES(updated_at)`,
      productRowParamsFull(row, createdAt),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Unknown column")) {
      await mysqlExecute(PRODUCT_UPSERT_SQL_LEGACY, [
        ...productRowParamsLegacy(row),
        createdAt,
      ]);
      try {
        await mysqlExecute(
          `UPDATE products SET stock_qty = COALESCE(?, stock_qty), status = COALESCE(?, status), in_stock = ? WHERE id = ?`,
          [row.stock_qty, row.status, row.in_stock ? 1 : 0, row.id],
        );
      } catch {
        /* optional columns */
      }
      return;
    }
    throw err;
  }
}

/** Insert-only — never UPDATE another row on slug collision. */
async function insertProductRow(row: ProductRow, createdAt: string): Promise<void> {
  try {
    await mysqlExecute(
      `INSERT INTO products (
        id, slug, title, short_description, description, category_id, images, weight_options,
        discount_price, in_stock, featured, bestseller, rating, review_count, seo, custom_fields, honey_meta,
        seller_id, approval_status, review_note, submitted_at, reviewed_at, deleted_at, published_at,
        status, stock_qty, sku, brand_id, updated_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      productRowParamsFull(row, createdAt),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Unknown column")) {
      await mysqlExecute(
        `INSERT INTO products (
          id, slug, title, short_description, description, category_id, images, weight_options,
          discount_price, in_stock, featured, bestseller, rating, review_count, honey_meta,
          seller_id, approval_status, review_note, submitted_at, reviewed_at, updated_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [...productRowParamsLegacy(row), createdAt],
      );
      try {
        await mysqlExecute(
          `UPDATE products SET stock_qty = ?, status = ?, in_stock = ? WHERE id = ?`,
          [row.stock_qty, row.status, row.in_stock ? 1 : 0, row.id],
        );
      } catch {
        /* optional columns */
      }
      return;
    }
    throw err;
  }
}

function productRowParamsFull(row: ProductRow, createdAt: string): unknown[] {
  return [
    row.id,
    row.slug,
    row.title,
    row.short_description,
    row.description,
    row.category_id,
    asJson(row.images),
    asJson(row.weight_options),
    row.discount_price,
    row.in_stock,
    row.featured,
    row.bestseller,
    row.rating,
    row.review_count,
    asJson(row.seo),
    asJson(row.custom_fields),
    asJson(row.honey_meta),
    row.seller_id,
    row.approval_status,
    row.review_note,
    row.submitted_at,
    row.reviewed_at,
    row.deleted_at,
    row.published_at,
    row.status,
    row.stock_qty,
    row.sku,
    row.brand_id,
    row.updated_at,
    createdAt,
  ];
}

async function findProductIdBySlugAny(slug: string): Promise<string | null> {
  if (isMysqlConfigured()) {
    try {
      const row = await mysqlQueryOne<RowDataPacket>(
        `SELECT id FROM products
         WHERE slug = ? AND deleted_at IS NULL
         LIMIT 1`,
        [slug],
      );
      if (row?.id) return String(row.id);
    } catch (err) {
      // Older schemas without deleted_at
      try {
        const row = await mysqlQueryOne<RowDataPacket>(
          "SELECT id FROM products WHERE slug = ? LIMIT 1",
          [slug],
        );
        if (row?.id) return String(row.id);
      } catch (inner) {
        console.warn(
          "[products] slug lookup failed:",
          inner instanceof Error ? inner.message : inner,
        );
      }
      void err;
    }
  }
  const runtime = await readRuntimeProducts();
  const fromRuntime = runtime.find((p) => p.slug === slug && !p.deletedAt);
  if (fromRuntime) return fromRuntime.id;
  const fromStatic = staticProducts.find((p) => p.slug === slug);
  return fromStatic?.id ?? null;
}

async function fetchAllFromMysql(): Promise<Product[] | null> {
  if (!isMysqlConfigured()) return null;
  try {
    const rows = await mysqlQuery<RowDataPacket>(
      "SELECT * FROM products ORDER BY created_at DESC",
    );
    return rows.map((row) => mapRowToProduct(row));
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[products] MySQL fetch unavailable, using local catalog:",
        err instanceof Error ? err.message : err,
      );
    }
    return null;
  }
}

async function readRuntimeProducts(): Promise<Product[]> {
  if (canUseFilesystemPersistence()) {
    return readJsonFile<Product[]>(PRODUCTS_RUNTIME_FILE, []);
  }
  return memoryGetCreatedProducts<Product>();
}

async function writeRuntimeProducts(products: Product[]): Promise<void> {
  if (canUseFilesystemPersistence()) {
    await writeJsonFile(PRODUCTS_RUNTIME_FILE, products);
    return;
  }
  memorySetCreatedProducts(products as unknown as Record<string, unknown>[]);
}

async function mergeWithRuntime(base: Product[]): Promise<Product[]> {
  const runtime = await readRuntimeProducts();
  if (runtime.length === 0) return base;
  const byId = new Map<string, Product>();
  for (const p of base) byId.set(p.id, p);
  for (const p of runtime) byId.set(p.id, p);
  return Array.from(byId.values());
}

async function readProductOverrides(): Promise<Record<string, Partial<Product>>> {
  if (canUseFilesystemPersistence()) {
    return readJsonFile<Record<string, Partial<Product>>>(
      PRODUCT_OVERRIDES_FILE,
      {},
    );
  }
  return memoryGetProductOverrides() as Record<string, Partial<Product>>;
}

async function writeProductOverride(
  id: string,
  patch: Partial<Product>,
): Promise<void> {
  // Persist explicit nulls so cleared fields (submittedAt, reviewNote, …)
  // are not resurrected from a previous override on the next read.
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    sanitized[key] = value === undefined ? null : value;
  }
  if (canUseFilesystemPersistence()) {
    const all = await readProductOverrides();
    all[id] = { ...(all[id] ?? {}), ...sanitized } as Partial<Product>;
    await writeJsonFile(PRODUCT_OVERRIDES_FILE, all);
    return;
  }
  memorySetProductOverride(id, sanitized);
}

type StockOverrideValue = boolean | { inStock: boolean; stockQty?: number };

async function readStockOverrides(): Promise<Record<string, StockOverrideValue>> {
  if (canUseFilesystemPersistence()) {
    return readJsonFile<Record<string, StockOverrideValue>>(
      STOCK_OVERRIDES_FILE,
      {},
    );
  }
  return memoryGetStockOverrides();
}

function normalizeStockOverrideValue(
  value: StockOverrideValue,
  fallback: Product,
): { inStock: boolean; stockQty?: number } {
  if (typeof value === "boolean") {
    if (!value) {
      return {
        inStock: false,
        ...(typeof fallback.stockQty === "number" ? { stockQty: 0 } : {}),
      };
    }
    if (typeof fallback.stockQty === "number" && fallback.stockQty <= 0) {
      return { inStock: true, stockQty: 1 };
    }
    return { inStock: true, stockQty: fallback.stockQty };
  }
  const qty =
    typeof value.stockQty === "number"
      ? Math.max(0, value.stockQty)
      : fallback.stockQty;
  const inStock =
    value.inStock !== false && (typeof qty !== "number" || qty > 0);
  return { inStock, stockQty: qty };
}

function applyStockOverridePatch(
  merged: Product,
  override: StockOverrideValue,
): Product {
  const next = normalizeStockOverrideValue(override, merged);
  return syncStockFields({
    ...merged,
    inStock: next.inStock,
    stockQty: next.stockQty,
  });
}

function applyProductOverridePatch(
  base: Product,
  patch: Partial<Product> & Record<string, unknown>,
): Product {
  const merged: Product = { ...base, id: base.id };
  for (const [key, value] of Object.entries(patch)) {
    if (key === "id") continue;
    if (value === null) {
      (merged as unknown as Record<string, unknown>)[key] = undefined;
    } else {
      (merged as unknown as Record<string, unknown>)[key] = value;
    }
  }
  return merged;
}

async function applyLocalOverrides(products: Product[]): Promise<Product[]> {
  const [productOverrides, stockOverrides] = await Promise.all([
    readProductOverrides(),
    readStockOverrides(),
  ]);
  return products.map((p) => {
    const patch = productOverrides[p.id] as
      | (Partial<Product> & Record<string, unknown>)
      | undefined;
    let merged = patch ? applyProductOverridePatch(p, patch) : p;
    // Skip seller-scoped keys (`seller:{sellerId}:{productId}`) — those are
    // applied only in getSellerProducts, never to the public catalog.
    if (p.id in stockOverrides) {
      merged = applyStockOverridePatch(merged, stockOverrides[p.id]!);
    }
    return syncStockFields(merged);
  });
}

function isPubliclyVisible(
  product: Product,
  activeSellerIds: Set<string>,
): boolean {
  if (product.deletedAt) return false;
  if ((product.status ?? "active") !== "active") return false;
  if (!product.sellerId) return true;
  const status = product.approvalStatus ?? "approved";
  if (status !== "approved") return false;
  return activeSellerIds.has(product.sellerId);
}

export async function getAllProductsAsync(
  options?: AdminProductListOptions,
): Promise<Product[]> {
  const fromDb = await fetchAllFromMysql();
  let seedOrDb: Product[];
  if (fromDb === null) {
    seedOrDb = getAllProductsSync();
  } else {
    seedOrDb = fromDb;
  }
  const base =
    fromDb === null ? await mergeWithRuntime(seedOrDb) : seedOrDb;
  const withOverrides = await applyLocalOverrides(base);
  const scope = options?.scope ?? "public";

  if (scope === "admin") {
    let list = withOverrides;
    if (options?.includeTrash) {
      list = list.filter((p) => Boolean(p.deletedAt));
    } else {
      list = list.filter((p) => !p.deletedAt);
    }
    if (options?.status && options.status !== "all") {
      list = list.filter((p) => (p.status ?? "active") === options.status);
    }
    if (options?.approvalStatus && options.approvalStatus !== "all") {
      if (options.approvalStatus === "awaiting") {
        list = list.filter(
          (p) =>
            Boolean(p.sellerId) &&
            p.approvalStatus === "pending" &&
            Boolean(p.submittedAt),
        );
      } else {
        list = list.filter(
          (p) => (p.approvalStatus ?? "approved") === options.approvalStatus,
        );
      }
    }
    return list;
  }

  if (scope === "seller") {
    const sellerId = options && "sellerId" in options ? options.sellerId : "";
    return withOverrides.filter(
      (p) => p.sellerId === sellerId && !p.deletedAt,
    );
  }

  const activeSellerIds = await getActiveSellerIdsAsync();
  return withOverrides.filter((p) => isPubliclyVisible(p, activeSellerIds));
}

export async function getProductBySlugAsync(
  slug: string,
): Promise<Product | undefined> {
  if (isMysqlConfigured()) {
    try {
      const row = await mysqlQueryOne<RowDataPacket>(
        "SELECT * FROM products WHERE slug = ? LIMIT 1",
        [slug],
      );
      if (row) {
        const [mapped] = await applyLocalOverrides([mapRowToProduct(row)]);
        if (!mapped) return undefined;
        const activeSellerIds = await getActiveSellerIdsAsync();
        if (!isPubliclyVisible(mapped, activeSellerIds)) return undefined;
        return mapped;
      }
    } catch (err) {
      console.warn("[products] mysql by slug failed, using fallback:", err);
    }
  }
  const local =
    getProductBySlugSync(slug) ??
    (await readRuntimeProducts()).find((p) => p.slug === slug);
  if (!local) return undefined;
  const [mapped] = await applyLocalOverrides([local]);
  if (!mapped) return undefined;
  try {
    const activeSellerIds = await getActiveSellerIdsAsync();
    if (!isPubliclyVisible(mapped, activeSellerIds)) return undefined;
  } catch {
    /* offline build / DB down: still show catalog seed */
  }
  return mapped;
}

export async function getProductByIdAsync(
  id: string,
  options?: { allowHidden?: boolean },
): Promise<Product | undefined> {
  if (isMysqlConfigured()) {
    try {
      const row = await mysqlQueryOne<RowDataPacket>(
        "SELECT * FROM products WHERE id = ? LIMIT 1",
        [id],
      );
      if (row) {
        const [mapped] = await applyLocalOverrides([mapRowToProduct(row)]);
        if (!mapped) return undefined;
        if (!options?.allowHidden) {
          const activeSellerIds = await getActiveSellerIdsAsync();
          if (!isPubliclyVisible(mapped, activeSellerIds)) return undefined;
        }
        return mapped;
      }
    } catch (error) {
      console.error(
        "[products] getProductByIdAsync mysql failed, falling back:",
        error instanceof Error ? error.message : error,
      );
    }
  }
  const local =
    staticProducts.find((p) => p.id === id) ??
    (await readRuntimeProducts()).find((p) => p.id === id);
  if (!local) return undefined;
  const [mapped] = await applyLocalOverrides([local]);
  if (!mapped) return undefined;
  if (!options?.allowHidden) {
    const activeSellerIds = await getActiveSellerIdsAsync();
    if (!isPubliclyVisible(mapped, activeSellerIds)) return undefined;
  }
  return mapped;
}

export async function getAllSlugsAsync(): Promise<string[]> {
  const products = await getAllProductsAsync();
  return products.map((p) => p.slug);
}

export async function filterProductsAsync(
  filters: ProductFilters,
): Promise<Product[]> {
  const catalog = await getAllProductsAsync();
  return filterProductsSync(filters, catalog);
}

export async function getBestsellersAsync(limit = 8): Promise<Product[]> {
  const catalog = await getAllProductsAsync();
  return catalog
    .filter((p) => p.isBestseller && isSellableCatalogProduct(p))
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, limit);
}

function productRecencyTs(product: Product): number {
  const raw = product.publishedAt ?? product.createdAt;
  if (!raw) return 0;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : 0;
}

function sortAmazingDeals(
  items: Product[],
  sort: AmazingDealsSort,
): Product[] {
  const sorted = [...items];
  switch (sort) {
    case "popular":
      return sorted.sort((a, b) => b.reviewCount - a.reviewCount);
    case "newest":
      return sorted.sort(
        (a, b) => productRecencyTs(b) - productRecencyTs(a),
      );
    case "discount-desc":
    default:
      return sorted.sort(
        (a, b) => getDiscountPercent(b) - getDiscountPercent(a),
      );
  }
}

export async function getAmazingDealsAsync(options: {
  limit: number;
  sort: AmazingDealsSort;
}): Promise<Product[]> {
  const catalog = await getAllProductsAsync();
  const deals = catalog.filter(
    (p) => isSellableCatalogProduct(p) && isProductOnSale(p),
  );
  return sortAmazingDeals(deals, options.sort).slice(0, options.limit);
}

export async function getRelatedProductsAsync(
  product: Product,
  limit = 8,
): Promise<Product[]> {
  const catalog = await getAllProductsAsync();
  return catalog
    .filter(
      (p) =>
        p.category === product.category && p.id !== product.id && p.inStock,
    )
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, limit);
}

export async function searchProductsAsync(
  query: string,
  limit = 24,
): Promise<Product[]> {
  const catalog = await getAllProductsAsync();
  return searchProductsSync(query, catalog).slice(0, limit);
}

async function readLocalRevisions(): Promise<ProductRevision[]> {
  if (canUseFilesystemPersistence()) {
    return readJsonFile<ProductRevision[]>(REVISIONS_FILE, []);
  }
  return [];
}

async function writeLocalRevisions(revs: ProductRevision[]): Promise<void> {
  if (canUseFilesystemPersistence()) {
    await writeJsonFile(REVISIONS_FILE, revs);
  }
}

export async function createProductRevisionAsync(
  product: Product,
  options?: { actor?: string; note?: string; diff?: Record<string, unknown> },
): Promise<ProductRevision | null> {
  const revision: ProductRevision = {
    id: randomUUID(),
    productId: product.id,
    actor: options?.actor ?? "admin",
    snapshot: product,
    diff: options?.diff ?? null,
    note: options?.note ?? null,
    createdAt: new Date().toISOString(),
  };

  if (isMysqlConfigured()) {
    try {
      await mysqlExecute(
        `INSERT INTO product_revisions (id, product_id, actor, snapshot, diff_json, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          revision.id,
          revision.productId,
          revision.actor,
          asJson(revision.snapshot),
          asJson(revision.diff),
          revision.note,
          revision.createdAt,
        ],
      );
      return revision;
    } catch (err) {
      console.error("[products] revision create failed:", err);
    }
  }

  const all = await readLocalRevisions();
  all.unshift(revision);
  await writeLocalRevisions(all.slice(0, 500));
  return revision;
}

export async function listProductRevisionsAsync(
  productId: string,
): Promise<ProductRevision[]> {
  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        `SELECT * FROM product_revisions WHERE product_id = ? ORDER BY created_at DESC LIMIT 50`,
        [productId],
      );
      return rows.map((row) => ({
        id: String(row.id),
        productId: String(row.product_id),
        actor: row.actor ? String(row.actor) : null,
        snapshot: parseJsonField<Product>(row.snapshot, {} as Product),
        diff: parseJsonField(row.diff_json, null),
        note: row.note ? String(row.note) : null,
        createdAt: toIso(row.created_at),
      }));
    } catch (err) {
      console.error("[products] list revisions failed:", err);
    }
  }
  const all = await readLocalRevisions();
  return all.filter((r) => r.productId === productId).slice(0, 50);
}

export async function restoreProductRevisionAsync(
  productId: string,
  revisionId: string,
): Promise<Product | null> {
  const revisions = await listProductRevisionsAsync(productId);
  const rev = revisions.find((r) => r.id === revisionId);
  if (!rev?.snapshot) return null;
  const { id: snapshotId, ...rest } = rev.snapshot;
  void snapshotId;
  return updateProductAsync(productId, rest, {
    revisionNote: `بازیابی نسخه ${revisionId.slice(0, 8)}`,
  });
}

export async function updateProductAsync(
  id: string,
  updates: Partial<Omit<Product, "stockQty">> & {
    stockQty?: number | null;
  },
  options?: { createRevision?: boolean; actor?: string; revisionNote?: string },
): Promise<Product | null> {
  const existing = await getProductByIdAsync(id, { allowHidden: true });
  if (!existing) return null;

  const stockPatch = applyStockUpdates(existing, {
    ...(typeof updates.inStock === "boolean"
      ? { inStock: updates.inStock }
      : {}),
    ...(typeof updates.stockQty === "number"
      ? { stockQty: updates.stockQty }
      : updates.stockQty === null
        ? { stockQty: null }
        : {}),
  });

  const merged: Product = {
    ...existing,
    ...updates,
    id,
    inStock: stockPatch.inStock,
    stockQty: stockPatch.stockQty,
  };

  if (
    updates.status === "active" &&
    existing.status !== "active" &&
    !merged.publishedAt
  ) {
    merged.publishedAt = new Date().toISOString();
  }

  const previousSlug = existing.slug;

  if (isMysqlConfigured()) {
    const row = mapProductToRow(merged);
    const createdAt = merged.createdAt ?? new Date().toISOString();

    try {
      await upsertProductRow(row, createdAt);
      if (options?.createRevision !== false) {
        await createProductRevisionAsync(merged, {
          actor: options?.actor,
          note: options?.revisionNote,
        });
      }
      revalidateProductPaths(merged.slug, previousSlug);
      const saved = await mysqlQueryOne<RowDataPacket>(
        "SELECT * FROM products WHERE id = ? LIMIT 1",
        [id],
      );
      if (saved) {
        const [result] = await applyLocalOverrides([mapRowToProduct(saved)]);
        return result ?? null;
      }
      return merged;
    } catch (err) {
      console.error(
        "[products] upsert failed:",
        err instanceof Error ? err.message : err,
      );
      await writeProductOverride(id, {
        ...updates,
        inStock: merged.inStock,
        stockQty: merged.stockQty,
      });
      if (typeof merged.inStock === "boolean") {
        if (canUseFilesystemPersistence()) {
          const stock = await readStockOverrides();
          stock[id] = {
            inStock: merged.inStock,
            ...(typeof merged.stockQty === "number"
              ? { stockQty: merged.stockQty }
              : {}),
          };
          await writeJsonFile(STOCK_OVERRIDES_FILE, stock);
        } else {
          memorySetStockOverride(id, {
            inStock: merged.inStock,
            stockQty:
              typeof merged.stockQty === "number" ? merged.stockQty : 0,
          });
        }
      }
      revalidateProductPaths(merged.slug, previousSlug);
      return merged;
    }
  }

  await writeProductOverride(id, {
    ...updates,
    inStock: merged.inStock,
    stockQty: merged.stockQty,
  });
  if (typeof merged.inStock === "boolean") {
    if (canUseFilesystemPersistence()) {
      const stock = await readStockOverrides();
      stock[id] = {
        inStock: merged.inStock,
        ...(typeof merged.stockQty === "number"
          ? { stockQty: merged.stockQty }
          : {}),
      };
      await writeJsonFile(STOCK_OVERRIDES_FILE, stock);
    } else {
      memorySetStockOverride(id, {
        inStock: merged.inStock,
        stockQty:
          typeof merged.stockQty === "number" ? merged.stockQty : 0,
      });
    }
  }

  const runtime = await readRuntimeProducts();
  const runtimeIdx = runtime.findIndex((p) => p.id === id);
  if (runtimeIdx >= 0) {
    const nextRuntime = [...runtime];
    nextRuntime[runtimeIdx] = merged;
    await writeRuntimeProducts(nextRuntime);
  }

  if (options?.createRevision !== false) {
    await createProductRevisionAsync(merged, {
      actor: options?.actor,
      note: options?.revisionNote,
    });
  }

  revalidateProductPaths(merged.slug, previousSlug);
  return merged;
}

export async function createProductAsync(
  product: Product,
): Promise<Product | null> {
  const stock = stockDefaultsForCreate(product);
  const withDefaults: Product = {
    ...product,
    status: product.status ?? "draft",
    inStock: stock.inStock,
    stockQty: stock.stockQty,
    customFields: product.customFields ?? {},
    seo: product.seo ?? {},
    deletedAt: null,
    publishedAt:
      product.status === "active"
        ? (product.publishedAt ?? new Date().toISOString())
        : null,
  };

  const clash = await findProductIdBySlugAny(withDefaults.slug);
  if (clash && clash !== withDefaults.id) {
    throw new Error("محصولی با این اسلاگ از قبل وجود دارد");
  }
  const existingId = await getProductByIdAsync(withDefaults.id, {
    allowHidden: true,
  });
  if (existingId) {
    throw new Error("محصولی با این شناسه از قبل وجود دارد");
  }

  if (isMysqlConfigured()) {
    const row = mapProductToRow(withDefaults);
    const createdAt = withDefaults.createdAt ?? new Date().toISOString();
    try {
      await insertProductRow(row, createdAt);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/duplicate|er_dup_entry/i.test(msg)) {
        throw new Error("محصولی با این شناسه یا اسلاگ از قبل وجود دارد");
      }
      console.error("[products] create insert failed:", msg);
      return null;
    }
    const saved = await mysqlQueryOne<RowDataPacket>(
      "SELECT * FROM products WHERE id = ? LIMIT 1",
      [withDefaults.id],
    );
    if (!saved) return null;
    revalidateProductPaths(withDefaults.slug);
    const mapped = mapRowToProduct(saved);
    await createProductRevisionAsync(mapped, { note: "ایجاد محصول" });
    return mapped;
  }

  const runtime = await readRuntimeProducts();
  if (
    runtime.some(
      (p) => p.id === withDefaults.id || p.slug === withDefaults.slug,
    )
  ) {
    throw new Error("محصولی با این شناسه یا اسلاگ از قبل وجود دارد");
  }
  // Also clash with static catalog slugs
  if (staticProducts.some((p) => p.slug === withDefaults.slug || p.id === withDefaults.id)) {
    throw new Error("محصولی با این شناسه یا اسلاگ از قبل وجود دارد");
  }
  await writeRuntimeProducts([withDefaults, ...runtime]);
  revalidateProductPaths(withDefaults.slug);
  await createProductRevisionAsync(withDefaults, { note: "ایجاد محصول" });
  return withDefaults;
}

export async function setProductApprovalAsync(
  id: string,
  approvalStatus: ProductApprovalStatus,
  reviewNote?: string,
): Promise<Product | null> {
  const now = new Date().toISOString();
  const updates: Partial<Product> = {
    approvalStatus,
    reviewNote: reviewNote?.trim() || undefined,
    reviewedAt: now,
  };
  // Approved seller products must become publicly eligible (active + approved).
  // Rejected / returned-to-review products leave the storefront.
  if (approvalStatus === "approved") {
    updates.status = "active";
  } else {
    updates.status = "draft";
  }
  // Rejected products leave the awaiting queue until the seller resubmits.
  if (approvalStatus === "rejected") {
    updates.submittedAt = undefined;
  }
  return updateProductAsync(id, updates, {
    revisionNote: `تغییر وضعیت تأیید: ${approvalStatus}`,
  });
}

export async function softDeleteProductAsync(id: string): Promise<boolean> {
  const result = await updateProductAsync(
    id,
    { deletedAt: new Date().toISOString() },
    { revisionNote: "انتقال به سطل زباله" },
  );
  return Boolean(result);
}

export async function restoreProductAsync(id: string): Promise<Product | null> {
  return updateProductAsync(
    id,
    { deletedAt: null },
    { revisionNote: "بازیابی از سطل زباله" },
  );
}

export async function purgeProductAsync(id: string): Promise<boolean> {
  return deleteProductAsync(id);
}

export async function deleteProductAsync(id: string): Promise<boolean> {
  const existing = await getProductByIdAsync(id, { allowHidden: true });
  if (!existing) return false;

  if (isMysqlConfigured()) {
    try {
      await mysqlExecute("DELETE FROM products WHERE id = ?", [id]);
    } catch {
      return false;
    }
    revalidateProductPaths(existing.slug);
    return true;
  }

  const runtime = await readRuntimeProducts();
  const next = runtime.filter((p) => p.id !== id);
  if (next.length === runtime.length) return false;
  await writeRuntimeProducts(next);
  revalidateProductPaths(existing.slug);
  return true;
}

export type BulkProductAction =
  | { action: "set_stock"; inStock: boolean }
  | { action: "set_status"; status: ProductStatus }
  | { action: "set_category"; category: ProductCategory; categoryLabel?: string }
  | { action: "adjust_prices"; percent: number }
  | { action: "trash" }
  | { action: "restore" }
  | { action: "purge" };

export async function bulkUpdateProductsAsync(
  ids: string[],
  op: BulkProductAction,
): Promise<{ ok: number; failed: number }> {
  let ok = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      let result: Product | boolean | null = null;
      switch (op.action) {
        case "set_stock":
          result = await updateProductAsync(
            id,
            { inStock: op.inStock, stockQty: op.inStock ? undefined : 0 },
            { revisionNote: "bulk stock" },
          );
          break;
        case "set_status": {
          const existing = await getProductByIdAsync(id, { allowHidden: true });
          if (!existing) {
            failed += 1;
            continue;
          }
          // Do not mark unapproved seller products as publicly "active".
          if (
            op.status === "active" &&
            existing.sellerId &&
            (existing.approvalStatus ?? "approved") !== "approved"
          ) {
            failed += 1;
            continue;
          }
          result = await updateProductAsync(
            id,
            { status: op.status },
            { revisionNote: "bulk status" },
          );
          break;
        }
        case "set_category":
          result = await updateProductAsync(
            id,
            {
              category: op.category,
              categoryLabel: op.categoryLabel ?? op.category,
            },
            { revisionNote: "bulk category" },
          );
          break;
        case "adjust_prices": {
          const existing = await getProductByIdAsync(id, { allowHidden: true });
          if (!existing) {
            failed += 1;
            continue;
          }
          const factor = 1 + op.percent / 100;
          const weightOptions = existing.weightOptions.map((w) => ({
            ...w,
            price: Math.round(w.price * factor),
          }));
          const discountPrice =
            existing.discountPrice != null
              ? Math.round(existing.discountPrice * factor)
              : undefined;
          result = await updateProductAsync(
            id,
            { weightOptions, discountPrice },
            { revisionNote: "bulk price" },
          );
          break;
        }
        case "trash":
          result = await softDeleteProductAsync(id);
          break;
        case "restore":
          result = await restoreProductAsync(id);
          break;
        case "purge":
          result = await purgeProductAsync(id);
          break;
        default:
          failed += 1;
          continue;
      }
      if (result) ok += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }
  return { ok, failed };
}

function revalidateProductPaths(slug: string, previousSlug?: string) {
  revalidatePath("/shop");
  revalidatePath(`/product/${slug}`);
  if (previousSlug && previousSlug !== slug) {
    revalidatePath(`/product/${previousSlug}`);
  }
  revalidatePath("/");
}

export function isProductsDbEnabled(): boolean {
  return isMysqlConfigured();
}

export { getBestsellersSync, getAllSlugsSync };
