import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2/promise";
import productsData from "@/data/products.json";
import type {
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
  filterProducts as filterProductsSync,
  getAllProducts as getAllProductsSync,
  getProductBySlug as getProductBySlugSync,
  getBestsellers as getBestsellersSync,
  getAllSlugs as getAllSlugsSync,
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
    categoryLabel: categoryLabels[categoryId] ?? categoryId,
    images: parseJsonField<string[]>(row.images, []),
    weightOptions: parseJsonField<WeightOption[]>(row.weight_options, []),
    discountPrice: row.discount_price
      ? Number(row.discount_price)
      : undefined,
    inStock: toBool(row.in_stock),
    stockQty:
      row.stock_qty != null
        ? Number(row.stock_qty)
        : toBool(row.in_stock)
          ? 1
          : 0,
    status: (row.status as ProductStatus) ?? "active",
    sku: row.sku ? String(row.sku) : undefined,
    brandId: row.brand_id ? String(row.brand_id) : null,
    rating: Number(row.rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
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
    },
    seller_id: product.sellerId ?? null,
    approval_status: product.approvalStatus ?? "approved",
    review_note: product.reviewNote ?? null,
    submitted_at: product.submittedAt ?? null,
    reviewed_at: product.reviewedAt ?? null,
    deleted_at: product.deletedAt ?? null,
    published_at: product.publishedAt ?? null,
    status: product.status ?? "active",
    stock_qty: product.stockQty ?? (product.inStock === false ? 0 : 1),
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
      [
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
      ],
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

async function fetchAllFromMysql(): Promise<Product[] | null> {
  if (!isMysqlConfigured()) return null;
  try {
    const rows = await mysqlQuery<RowDataPacket>(
      "SELECT * FROM products ORDER BY created_at DESC",
    );
    return rows.map((row) => mapRowToProduct(row));
  } catch (err) {
    console.error(
      "[products] fetch failed:",
      err instanceof Error ? err.message : err,
    );
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
  if (canUseFilesystemPersistence()) {
    const all = await readProductOverrides();
    all[id] = { ...(all[id] ?? {}), ...patch };
    await writeJsonFile(PRODUCT_OVERRIDES_FILE, all);
    return;
  }
  memorySetProductOverride(id, patch as Record<string, unknown>);
}

async function readStockOverrides(): Promise<Record<string, boolean>> {
  if (canUseFilesystemPersistence()) {
    return readJsonFile<Record<string, boolean>>(STOCK_OVERRIDES_FILE, {});
  }
  return memoryGetStockOverrides();
}

async function applyLocalOverrides(products: Product[]): Promise<Product[]> {
  const [productOverrides, stockOverrides] = await Promise.all([
    readProductOverrides(),
    readStockOverrides(),
  ]);
  return products.map((p) => {
    const patch = productOverrides[p.id];
    const merged = patch ? { ...p, ...patch, id: p.id } : p;
    if (p.id in stockOverrides) {
      return { ...merged, inStock: stockOverrides[p.id]! };
    }
    return merged;
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
  } else if (fromDb.length === 0) {
    seedOrDb = getAllProductsSync();
  } else {
    const byId = new Map<string, Product>();
    for (const p of getAllProductsSync()) byId.set(p.id, p);
    for (const p of fromDb) byId.set(p.id, p);
    seedOrDb = Array.from(byId.values());
  }
  const base = await mergeWithRuntime(seedOrDb);
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
  return catalog.filter((p) => p.isBestseller && p.inStock).slice(0, limit);
}

export async function getRelatedProductsAsync(
  product: Product,
  limit = 4,
): Promise<Product[]> {
  const catalog = await getAllProductsAsync();
  return catalog
    .filter(
      (p) =>
        p.category === product.category && p.id !== product.id && p.inStock,
    )
    .slice(0, limit);
}

export async function searchProductsAsync(query: string): Promise<Product[]> {
  const q = query.trim().toLowerCase().replace(/ي/g, "ی").replace(/ك/g, "ک");
  if (!q) return [];
  const catalog = await getAllProductsAsync();
  const scored = catalog
    .map((p) => {
      const title = p.title.toLowerCase().replace(/ي/g, "ی").replace(/ك/g, "ک");
      const slug = p.slug.toLowerCase();
      const category = `${p.categoryLabel} ${p.category}`
        .toLowerCase()
        .replace(/ي/g, "ی")
        .replace(/ك/g, "ک");
      const body = `${p.shortDescription} ${p.longDescription}`
        .toLowerCase()
        .replace(/ي/g, "ی")
        .replace(/ك/g, "ک");
      let score = 0;
      if (title === q) score += 100;
      else if (title.startsWith(q)) score += 80;
      else if (title.includes(q)) score += 60;
      if (slug.includes(q)) score += 40;
      if (category.includes(q)) score += 30;
      if (body.includes(q)) score += 10;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.map((x) => x.p);
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
  updates: Partial<Product>,
  options?: { createRevision?: boolean; actor?: string; revisionNote?: string },
): Promise<Product | null> {
  const existing = await getProductByIdAsync(id, { allowHidden: true });
  if (!existing) return null;

  const merged = { ...existing, ...updates, id };

  if (
    updates.status === "active" &&
    existing.status !== "active" &&
    !merged.publishedAt
  ) {
    merged.publishedAt = new Date().toISOString();
  }

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
      revalidateProductPaths(merged.slug);
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
      await writeProductOverride(id, updates);
      if (typeof updates.inStock === "boolean") {
        if (canUseFilesystemPersistence()) {
          const stock = await readStockOverrides();
          stock[id] = updates.inStock;
          await writeJsonFile(STOCK_OVERRIDES_FILE, stock);
        } else {
          memorySetStockOverride(id, updates.inStock);
        }
      }
      revalidateProductPaths(merged.slug);
      return merged;
    }
  }

  await writeProductOverride(id, updates);
  if (typeof updates.inStock === "boolean") {
    if (canUseFilesystemPersistence()) {
      const stock = await readStockOverrides();
      stock[id] = updates.inStock;
      await writeJsonFile(STOCK_OVERRIDES_FILE, stock);
    } else {
      memorySetStockOverride(id, updates.inStock);
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

  revalidateProductPaths(merged.slug);
  return merged;
}

export async function createProductAsync(
  product: Product,
): Promise<Product | null> {
  const withDefaults: Product = {
    ...product,
    status: product.status ?? "draft",
    customFields: product.customFields ?? {},
    seo: product.seo ?? {},
    deletedAt: null,
    publishedAt:
      product.status === "active"
        ? (product.publishedAt ?? new Date().toISOString())
        : null,
  };

  if (isMysqlConfigured()) {
    const row = mapProductToRow(withDefaults);
    const createdAt = withDefaults.createdAt ?? new Date().toISOString();
    try {
      await upsertProductRow(row, createdAt);
    } catch {
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
  return updateProductAsync(id, {
    approvalStatus,
    reviewNote: reviewNote?.trim() || undefined,
    reviewedAt: now,
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
        case "set_status":
          result = await updateProductAsync(
            id,
            { status: op.status },
            { revisionNote: "bulk status" },
          );
          break;
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

function revalidateProductPaths(slug: string) {
  revalidatePath("/shop");
  revalidatePath(`/product/${slug}`);
  revalidatePath("/");
}

export function isProductsDbEnabled(): boolean {
  return isMysqlConfigured();
}

export { getBestsellersSync, getAllSlugsSync };
