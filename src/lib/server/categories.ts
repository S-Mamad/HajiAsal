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
    const rows = await mysqlQuery<RowDataPacket>(
      "SELECT * FROM categories ORDER BY sort_order ASC",
    );
    if (rows.length) return rows.map(mapRow);
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

  const row = await mysqlQueryOne<RowDataPacket>(
    "SELECT * FROM categories WHERE id = ? LIMIT 1",
    [category.id],
  );
  return row ? mapRow(row) : null;
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
