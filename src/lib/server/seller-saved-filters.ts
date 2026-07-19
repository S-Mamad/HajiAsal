import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import {
  isMysqlConfigured,
  mysqlExecute,
  mysqlQuery,
  mysqlQueryOne,
  toIso,
} from "./mysql";

export type SavedFilter = {
  id: string;
  sellerId: string;
  moduleKey: string;
  name: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

const memory: SavedFilter[] = [];

export async function listSavedFilters(
  sellerId: string,
  moduleKey: string,
): Promise<SavedFilter[]> {
  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        `SELECT * FROM seller_saved_filters
         WHERE seller_id = ? AND module_key = ?
         ORDER BY updated_at DESC`,
        [sellerId, moduleKey],
      );
      return rows.map(mapRow);
    } catch {
      /* fallthrough */
    }
  }
  return memory.filter(
    (f) => f.sellerId === sellerId && f.moduleKey === moduleKey,
  );
}

export async function createSavedFilter(input: {
  sellerId: string;
  moduleKey: string;
  name: string;
  payload: Record<string, unknown>;
}): Promise<SavedFilter> {
  const now = new Date().toISOString();
  const row: SavedFilter = {
    id: randomUUID(),
    sellerId: input.sellerId,
    moduleKey: input.moduleKey,
    name: input.name.trim(),
    payload: input.payload,
    createdAt: now,
    updatedAt: now,
  };

  if (isMysqlConfigured()) {
    try {
      await mysqlExecute(
        `INSERT INTO seller_saved_filters
          (id, seller_id, module_key, name, payload, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id,
          row.sellerId,
          row.moduleKey,
          row.name,
          JSON.stringify(row.payload),
          now,
          now,
        ],
      );
      return row;
    } catch (error) {
      console.error("[saved-filters] create failed", error);
    }
  }

  memory.unshift(row);
  return row;
}

export async function deleteSavedFilter(
  sellerId: string,
  id: string,
): Promise<boolean> {
  if (isMysqlConfigured()) {
    try {
      const result = await mysqlExecute(
        `DELETE FROM seller_saved_filters WHERE id = ? AND seller_id = ?`,
        [id, sellerId],
      );
      return result.affectedRows > 0;
    } catch {
      return false;
    }
  }
  const idx = memory.findIndex((f) => f.id === id && f.sellerId === sellerId);
  if (idx < 0) return false;
  memory.splice(idx, 1);
  return true;
}

export async function getSavedFilter(
  sellerId: string,
  id: string,
): Promise<SavedFilter | null> {
  if (isMysqlConfigured()) {
    try {
      const row = await mysqlQueryOne<RowDataPacket>(
        `SELECT * FROM seller_saved_filters WHERE id = ? AND seller_id = ? LIMIT 1`,
        [id, sellerId],
      );
      return row ? mapRow(row) : null;
    } catch {
      return null;
    }
  }
  return memory.find((f) => f.id === id && f.sellerId === sellerId) ?? null;
}

function mapRow(r: RowDataPacket): SavedFilter {
  const payload =
    typeof r.payload === "string"
      ? (JSON.parse(r.payload) as Record<string, unknown>)
      : ((r.payload as Record<string, unknown>) ?? {});
  return {
    id: String(r.id),
    sellerId: String(r.seller_id),
    moduleKey: String(r.module_key),
    name: String(r.name),
    payload,
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
  };
}
