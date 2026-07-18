import type { RowDataPacket } from "mysql2/promise";
import productsData from "@/data/products.json";
import type {
  Product,
  ProductApprovalStatus,
  ProductCategory,
  ProductFilters,
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

export type ProductListScope =
  | { scope?: "public" }
  | { scope: "admin" }
  | { scope: "seller"; sellerId: string };

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
    status: (row.status as Product["status"]) ?? "active",
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
    honey_meta: {
      ingredients: product.ingredients,
      shippingInfo: product.shippingInfo,
    },
    seller_id: product.sellerId ?? null,
    approval_status: product.approvalStatus ?? "approved",
    review_note: product.reviewNote ?? null,
    submitted_at: product.submittedAt ?? null,
    reviewed_at: product.reviewedAt ?? null,
    updated_at: new Date().toISOString(),
  };
}

type ProductRow = ReturnType<typeof mapProductToRow>;

function productRowParams(row: ProductRow): unknown[] {
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

const PRODUCT_UPSERT_SQL = `INSERT INTO products (
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
  if (!product.sellerId) return true;
  const status = product.approvalStatus ?? "approved";
  if (status !== "approved") return false;
  return activeSellerIds.has(product.sellerId);
}

export async function getAllProductsAsync(
  options?: ProductListScope,
): Promise<Product[]> {
  const fromDb = await fetchAllFromMysql();
  let seedOrDb: Product[];
  if (fromDb === null) {
    seedOrDb = getAllProductsSync();
  } else if (fromDb.length === 0) {
    // DB connected but empty → keep seed catalog until seeded.
    seedOrDb = getAllProductsSync();
  } else {
    // Merge: DB rows win on id collision; seed fills gaps so one insert
    // does not wipe the rest of the catalog.
    const byId = new Map<string, Product>();
    for (const p of getAllProductsSync()) byId.set(p.id, p);
    for (const p of fromDb) byId.set(p.id, p);
    seedOrDb = Array.from(byId.values());
  }
  const base = await mergeWithRuntime(seedOrDb);
  const withOverrides = await applyLocalOverrides(base);

  const scope = options?.scope ?? "public";

  if (scope === "admin") {
    return withOverrides;
  }

  if (scope === "seller") {
    const sellerId = options && "sellerId" in options ? options.sellerId : "";
    return withOverrides.filter((p) => p.sellerId === sellerId);
  }

  const activeSellerIds = await getActiveSellerIdsAsync();
  return withOverrides.filter((p) => isPubliclyVisible(p, activeSellerIds));
}

export async function getProductBySlugAsync(
  slug: string,
): Promise<Product | undefined> {
  if (isMysqlConfigured()) {
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
  }
  const local =
    getProductBySlugSync(slug) ??
    (await readRuntimeProducts()).find((p) => p.slug === slug);
  if (!local) return undefined;
  const [mapped] = await applyLocalOverrides([local]);
  if (!mapped) return undefined;
  if (mapped.sellerId) {
    const activeSellerIds = await getActiveSellerIdsAsync();
    if (!isPubliclyVisible(mapped, activeSellerIds)) return undefined;
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
  if (!options?.allowHidden && mapped.sellerId) {
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
        p.category === product.category &&
        p.id !== product.id &&
        p.inStock,
    )
    .slice(0, limit);
}

export async function searchProductsAsync(query: string): Promise<Product[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const catalog = await getAllProductsAsync();
  return catalog.filter((p) => {
    const haystack = [
      p.title,
      p.slug,
      p.shortDescription,
      p.categoryLabel,
      p.longDescription,
      p.category,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export async function updateProductAsync(
  id: string,
  updates: Partial<Product>,
): Promise<Product | null> {
  const existing = await getProductByIdAsync(id, { allowHidden: true });
  if (!existing) return null;

  const merged = { ...existing, ...updates, id };

  if (isMysqlConfigured()) {
    const row = mapProductToRow(merged);
    const createdAt = merged.createdAt ?? new Date().toISOString();

    try {
      await mysqlExecute(PRODUCT_UPSERT_SQL, [
        ...productRowParams(row),
        createdAt,
      ]);
      revalidateProductPaths(merged.slug);
      const saved = await mysqlQueryOne<RowDataPacket>(
        "SELECT * FROM products WHERE id = ? LIMIT 1",
        [id],
      );
      if (saved) {
        const [result] = await applyLocalOverrides([mapRowToProduct(saved)]);
        if (result && (updates.stockQty !== undefined || updates.status !== undefined)) {
          try {
            await mysqlExecute(
              `UPDATE products SET stock_qty = COALESCE(?, stock_qty), status = COALESCE(?, status), in_stock = ? WHERE id = ?`,
              [
                updates.stockQty ?? null,
                updates.status ?? null,
                merged.inStock ? 1 : 0,
                id,
              ],
            );
            return {
              ...result,
              stockQty: updates.stockQty ?? result.stockQty,
              status: updates.status ?? result.status,
              inStock: merged.inStock,
            };
          } catch {
            return {
              ...result,
              stockQty: updates.stockQty ?? result.stockQty,
              status: updates.status ?? result.status,
            };
          }
        }
        return result ?? null;
      }
      return merged;
    } catch (err) {
      console.error(
        "[products] upsert failed:",
        err instanceof Error ? err.message : err,
      );
      // Fall back to local overrides so admin edits still stick.
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

  // Keep runtime-created products in sync (full document, not just overrides).
  const runtime = await readRuntimeProducts();
  const runtimeIdx = runtime.findIndex((p) => p.id === id);
  if (runtimeIdx >= 0) {
    const nextRuntime = [...runtime];
    nextRuntime[runtimeIdx] = merged;
    await writeRuntimeProducts(nextRuntime);
  }

  revalidateProductPaths(merged.slug);
  return merged;
}

export async function createProductAsync(
  product: Product,
): Promise<Product | null> {
  if (isMysqlConfigured()) {
    const row = mapProductToRow(product);
    const createdAt = product.createdAt ?? new Date().toISOString();

    try {
      await mysqlExecute(
        `INSERT INTO products (
          id, slug, title, short_description, description, category_id, images, weight_options,
          discount_price, in_stock, featured, bestseller, rating, review_count, honey_meta,
          seller_id, approval_status, review_note, submitted_at, reviewed_at, updated_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [...productRowParams(row), createdAt],
      );
    } catch {
      return null;
    }

    const saved = await mysqlQueryOne<RowDataPacket>(
      "SELECT * FROM products WHERE id = ? LIMIT 1",
      [product.id],
    );
    if (!saved) return null;
    revalidateProductPaths(product.slug);
    return mapRowToProduct(saved);
  }

  // Local / demo fallback when MySQL is not configured
  const runtime = await readRuntimeProducts();
  if (runtime.some((p) => p.id === product.id || p.slug === product.slug)) {
    throw new Error("محصولی با این شناسه یا اسلاگ از قبل وجود دارد");
  }
  const next = [product, ...runtime];
  await writeRuntimeProducts(next);
  revalidateProductPaths(product.slug);
  return product;
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
  if (next.length === runtime.length) {
    // Seed catalog product: mark deleted via override hide is not supported;
    // only runtime-created products can be deleted locally.
    return false;
  }
  await writeRuntimeProducts(next);
  revalidateProductPaths(existing.slug);
  return true;
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
