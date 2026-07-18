import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import {
  isMysqlConfigured,
  mysqlExecute,
  mysqlQuery,
  mysqlQueryOne,
  toIso,
} from "./mysql";

export type SellerActivityInput = {
  sellerId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
};

export type SellerActivityRow = {
  id: string;
  sellerId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: string;
};

const memoryLogs: SellerActivityRow[] = [];

export async function logSellerActivity(
  input: SellerActivityInput,
): Promise<void> {
  const row: SellerActivityRow = {
    id: randomUUID(),
    sellerId: input.sellerId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    meta: input.meta,
    ip: input.ip,
    userAgent: input.userAgent,
    createdAt: new Date().toISOString(),
  };

  if (isMysqlConfigured()) {
    try {
      await mysqlExecute(
        `INSERT INTO seller_activity_logs
          (id, seller_id, action, entity_type, entity_id, meta, ip, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id,
          row.sellerId,
          row.action,
          row.entityType ?? null,
          row.entityId ?? null,
          row.meta ? JSON.stringify(row.meta) : null,
          row.ip ?? null,
          row.userAgent ?? null,
          row.createdAt,
        ],
      );
      return;
    } catch (error) {
      console.error(
        "[seller-activity] insert failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  memoryLogs.unshift(row);
  if (memoryLogs.length > 500) memoryLogs.length = 500;
}

export async function listSellerActivity(params: {
  sellerId: string;
  limit?: number;
  offset?: number;
  action?: string;
}): Promise<{ rows: SellerActivityRow[]; total: number }> {
  const limit = Math.min(Math.max(params.limit ?? 25, 1), 100);
  const offset = Math.max(params.offset ?? 0, 0);

  if (isMysqlConfigured()) {
    try {
      const where = ["seller_id = ?"];
      const args: unknown[] = [params.sellerId];
      if (params.action) {
        where.push("action = ?");
        args.push(params.action);
      }
      const whereSql = where.join(" AND ");

      const countOne = await mysqlQueryOne<RowDataPacket>(
        `SELECT COUNT(*) AS c FROM seller_activity_logs WHERE ${whereSql}`,
        args,
      );
      const total = Number(countOne?.c ?? 0);

      const rows = await mysqlQuery<RowDataPacket>(
        `SELECT * FROM seller_activity_logs
         WHERE ${whereSql}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [...args, limit, offset],
      );

      return {
        total,
        rows: rows.map((r) => ({
          id: String(r.id),
          sellerId: String(r.seller_id),
          action: String(r.action),
          entityType: r.entity_type != null ? String(r.entity_type) : undefined,
          entityId: r.entity_id != null ? String(r.entity_id) : undefined,
          meta:
            typeof r.meta === "string"
              ? (JSON.parse(r.meta) as Record<string, unknown>)
              : ((r.meta as Record<string, unknown>) ?? undefined),
          ip: r.ip != null ? String(r.ip) : undefined,
          userAgent: r.user_agent != null ? String(r.user_agent) : undefined,
          createdAt: toIso(r.created_at),
        })),
      };
    } catch (error) {
      console.error(
        "[seller-activity] list failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  let filtered = memoryLogs.filter((r) => r.sellerId === params.sellerId);
  if (params.action) {
    filtered = filtered.filter((r) => r.action === params.action);
  }
  return {
    total: filtered.length,
    rows: filtered.slice(offset, offset + limit),
  };
}
