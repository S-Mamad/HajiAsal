import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2/promise";
import type { ProductFieldDefinition, CustomFieldType } from "@/types";
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
import { readJsonFile, writeJsonFile } from "./db";
import { canUseFilesystemPersistence } from "./production";

const FIELDS_FILE = "product-field-definitions.json";

function mapRow(row: Record<string, unknown>): ProductFieldDefinition {
  return {
    id: String(row.id),
    key: String(row.field_key),
    label: String(row.label),
    type: row.field_type as CustomFieldType,
    options: parseJsonField(row.options, undefined),
    validation: parseJsonField(row.validation_rules, undefined),
    scope: (row.scope as "product" | "category") ?? "product",
    categoryId: row.category_id ? String(row.category_id) : null,
    sortOrder: Number(row.sort_order ?? 0),
    isRequired: toBool(row.is_required),
    createdAt: row.created_at ? toIso(row.created_at) : undefined,
    updatedAt: row.updated_at ? toIso(row.updated_at) : undefined,
  };
}

async function readLocal(): Promise<ProductFieldDefinition[]> {
  if (canUseFilesystemPersistence()) {
    return readJsonFile<ProductFieldDefinition[]>(FIELDS_FILE, []);
  }
  return [];
}

async function writeLocal(fields: ProductFieldDefinition[]): Promise<void> {
  if (canUseFilesystemPersistence()) {
    await writeJsonFile(FIELDS_FILE, fields);
  }
}

export async function listProductFieldsAsync(options?: {
  categoryId?: string | null;
}): Promise<ProductFieldDefinition[]> {
  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        `SELECT * FROM product_field_definitions
         ORDER BY sort_order ASC, created_at ASC`,
      );
      let fields = rows.map((r) => mapRow(r));
      if (options?.categoryId) {
        fields = fields.filter(
          (f) =>
            f.scope === "product" ||
            (f.scope === "category" && f.categoryId === options.categoryId),
        );
      }
      return fields;
    } catch (err) {
      console.error("[product-fields] list failed:", err);
    }
  }
  let fields = await readLocal();
  if (options?.categoryId) {
    fields = fields.filter(
      (f) =>
        f.scope === "product" ||
        (f.scope === "category" && f.categoryId === options.categoryId),
    );
  }
  return fields;
}

export async function getProductFieldAsync(
  id: string,
): Promise<ProductFieldDefinition | null> {
  if (isMysqlConfigured()) {
    const row = await mysqlQueryOne<RowDataPacket>(
      "SELECT * FROM product_field_definitions WHERE id = ? LIMIT 1",
      [id],
    );
    if (row) return mapRow(row);
  }
  const local = await readLocal();
  return local.find((f) => f.id === id) ?? null;
}

export async function createProductFieldAsync(
  input: Omit<ProductFieldDefinition, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
  },
): Promise<ProductFieldDefinition | null> {
  const field: ProductFieldDefinition = {
    ...input,
    id: input.id ?? randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (isMysqlConfigured()) {
    try {
      await mysqlExecute(
        `INSERT INTO product_field_definitions (
          id, field_key, label, field_type, options, validation_rules,
          scope, category_id, sort_order, is_required, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          field.id,
          field.key,
          field.label,
          field.type,
          asJson(field.options ?? null),
          asJson(field.validation ?? null),
          field.scope,
          field.categoryId ?? null,
          field.sortOrder,
          field.isRequired ? 1 : 0,
          field.createdAt,
          field.updatedAt,
        ],
      );
      return field;
    } catch (err) {
      console.error("[product-fields] create failed:", err);
      return null;
    }
  }

  const local = await readLocal();
  local.push(field);
  await writeLocal(local);
  return field;
}

export async function updateProductFieldAsync(
  id: string,
  patch: Partial<ProductFieldDefinition>,
): Promise<ProductFieldDefinition | null> {
  const existing = await getProductFieldAsync(id);
  if (!existing) return null;
  const merged: ProductFieldDefinition = {
    ...existing,
    ...patch,
    id,
    updatedAt: new Date().toISOString(),
  };

  if (isMysqlConfigured()) {
    try {
      await mysqlExecute(
        `UPDATE product_field_definitions SET
          field_key = ?, label = ?, field_type = ?, options = ?,
          validation_rules = ?, scope = ?, category_id = ?,
          sort_order = ?, is_required = ?, updated_at = ?
         WHERE id = ?`,
        [
          merged.key,
          merged.label,
          merged.type,
          asJson(merged.options ?? null),
          asJson(merged.validation ?? null),
          merged.scope,
          merged.categoryId ?? null,
          merged.sortOrder,
          merged.isRequired ? 1 : 0,
          merged.updatedAt,
          id,
        ],
      );
      return merged;
    } catch (err) {
      console.error("[product-fields] update failed:", err);
      return null;
    }
  }

  const local = await readLocal();
  const idx = local.findIndex((f) => f.id === id);
  if (idx < 0) return null;
  local[idx] = merged;
  await writeLocal(local);
  return merged;
}

export async function deleteProductFieldAsync(id: string): Promise<boolean> {
  if (isMysqlConfigured()) {
    try {
      await mysqlExecute(
        "DELETE FROM product_field_definitions WHERE id = ?",
        [id],
      );
      return true;
    } catch {
      return false;
    }
  }
  const local = await readLocal();
  const next = local.filter((f) => f.id !== id);
  if (next.length === local.length) return false;
  await writeLocal(next);
  return true;
}
