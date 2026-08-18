import type { RowDataPacket } from "mysql2/promise";
import categoriesData from "@/data/site.json";
import type { SiteConfig } from "@/types";
import { isMysqlConfigured, mysqlExecute, mysqlQuery, mysqlQueryOne } from "./mysql";

export interface CategoryRecord {
  id: string;
  slug: string;
  name: string;
  description?: string;
  image?: string;
  sortOrder: number;
}

const siteCategories = (categoriesData as SiteConfig).categories;

function mapRow(row: Record<string, unknown>): CategoryRecord {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    description: (row.description as string) ?? undefined,
    image: (row.image as string) ?? undefined,
    sortOrder: Number(row.sort_order ?? 0),
  };
}

export async function getAllCategoriesAsync(): Promise<CategoryRecord[]> {
  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        "SELECT * FROM categories ORDER BY sort_order ASC",
      );
      if (rows.length) return rows.map(mapRow);
    } catch (error) {
      console.error(
        "[categories] getAllCategoriesAsync mysql failed, falling back:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  return siteCategories.map((c, i) => ({
    id: c.id,
    slug: c.id,
    name: c.label,
    description: c.description,
    image: c.image,
    sortOrder: i,
  }));
}

export async function upsertCategoryAsync(
  category: CategoryRecord,
): Promise<CategoryRecord | null> {
  if (!isMysqlConfigured()) return null;

  try {
    await mysqlExecute(
      `INSERT INTO categories (id, slug, name, description, image, sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         slug = VALUES(slug), name = VALUES(name), description = VALUES(description),
         image = VALUES(image), sort_order = VALUES(sort_order), updated_at = VALUES(updated_at)`,
      [
        category.id,
        category.slug,
        category.name,
        category.description ?? null,
        category.image ?? null,
        category.sortOrder,
        new Date().toISOString(),
      ],
    );
  } catch {
    return null;
  }

  try {
    const row = await mysqlQueryOne<RowDataPacket>(
      "SELECT * FROM categories WHERE id = ? LIMIT 1",
      [category.id],
    );
    return row ? mapRow(row) : null;
  } catch {
    return null;
  }
}

export async function countProductsInCategoryAsync(
  categoryId: string,
): Promise<number> {
  if (!isMysqlConfigured()) return 0;
  try {
    const row = await mysqlQueryOne<RowDataPacket>(
      `SELECT COUNT(*) AS n FROM products
       WHERE category_id = ?
         AND (deleted_at IS NULL)`,
      [categoryId],
    );
    return Number(row?.n ?? 0);
  } catch {
    return 0;
  }
}

export async function reassignProductsCategoryAsync(
  fromId: string,
  toId: string,
): Promise<boolean> {
  if (!isMysqlConfigured()) return false;
  try {
    await mysqlExecute(
      `UPDATE products SET category_id = ?, updated_at = ? WHERE category_id = ?`,
      [toId, new Date().toISOString(), fromId],
    );
    return true;
  } catch {
    return false;
  }
}

export async function deleteCategoryAsync(id: string): Promise<boolean> {
  if (!isMysqlConfigured()) return false;
  try {
    const result = await mysqlExecute("DELETE FROM categories WHERE id = ?", [
      id,
    ]);
    return result.affectedRows > 0;
  } catch {
    return false;
  }
}
