import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import {
  isMysqlConfigured,
  mysqlExecute,
  mysqlQuery,
  mysqlQueryOne,
  toIso,
} from "./mysql";

export type SellerNotification = {
  id: string;
  sellerId: string;
  type: string;
  title: string;
  body?: string;
  href?: string;
  meta?: Record<string, unknown>;
  readAt?: string;
  createdAt: string;
};

const memoryNotifs: SellerNotification[] = [];

export async function createSellerNotification(input: {
  sellerId: string;
  type: string;
  title: string;
  body?: string;
  href?: string;
  meta?: Record<string, unknown>;
}): Promise<SellerNotification> {
  const row: SellerNotification = {
    id: randomUUID(),
    sellerId: input.sellerId,
    type: input.type,
    title: input.title,
    body: input.body,
    href: input.href,
    meta: input.meta,
    createdAt: new Date().toISOString(),
  };

  if (isMysqlConfigured()) {
    try {
      await mysqlExecute(
        `INSERT INTO seller_notifications
          (id, seller_id, type, title, body, href, meta, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id,
          row.sellerId,
          row.type,
          row.title,
          row.body ?? null,
          row.href ?? null,
          row.meta ? JSON.stringify(row.meta) : null,
          row.createdAt,
        ],
      );
      return row;
    } catch (error) {
      console.error(
        "[seller-notif] insert failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  memoryNotifs.unshift(row);
  return row;
}

export async function listSellerNotifications(params: {
  sellerId: string;
  limit?: number;
  unreadOnly?: boolean;
}): Promise<{ rows: SellerNotification[]; unreadCount: number }> {
  const limit = Math.min(Math.max(params.limit ?? 30, 1), 100);

  if (isMysqlConfigured()) {
    try {
      const unreadOne = await mysqlQueryOne<RowDataPacket>(
        `SELECT COUNT(*) AS c FROM seller_notifications
         WHERE seller_id = ? AND read_at IS NULL`,
        [params.sellerId],
      );
      const unreadCount = Number(unreadOne?.c ?? 0);

      const where = ["seller_id = ?"];
      const args: unknown[] = [params.sellerId];
      if (params.unreadOnly) where.push("read_at IS NULL");

      const rows = await mysqlQuery<RowDataPacket>(
        `SELECT * FROM seller_notifications
         WHERE ${where.join(" AND ")}
         ORDER BY created_at DESC
         LIMIT ?`,
        [...args, limit],
      );

      return {
        unreadCount,
        rows: rows.map(mapNotifRow),
      };
    } catch (error) {
      console.error(
        "[seller-notif] list failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  let filtered = memoryNotifs.filter((n) => n.sellerId === params.sellerId);
  const unreadCount = filtered.filter((n) => !n.readAt).length;
  if (params.unreadOnly) filtered = filtered.filter((n) => !n.readAt);
  return { unreadCount, rows: filtered.slice(0, limit) };
}

export async function markSellerNotificationsRead(params: {
  sellerId: string;
  ids?: string[];
  all?: boolean;
}): Promise<number> {
  const now = new Date().toISOString();

  if (isMysqlConfigured()) {
    try {
      if (params.all) {
        const result = await mysqlExecute(
          `UPDATE seller_notifications SET read_at = ?
           WHERE seller_id = ? AND read_at IS NULL`,
          [now, params.sellerId],
        );
        return result.affectedRows;
      }
      if (params.ids?.length) {
        const placeholders = params.ids.map(() => "?").join(",");
        const result = await mysqlExecute(
          `UPDATE seller_notifications SET read_at = ?
           WHERE seller_id = ? AND id IN (${placeholders}) AND read_at IS NULL`,
          [now, params.sellerId, ...params.ids],
        );
        return result.affectedRows;
      }
    } catch (error) {
      console.error(
        "[seller-notif] mark read failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  let count = 0;
  for (const n of memoryNotifs) {
    if (n.sellerId !== params.sellerId || n.readAt) continue;
    if (params.all || params.ids?.includes(n.id)) {
      n.readAt = now;
      count += 1;
    }
  }
  return count;
}

function mapNotifRow(r: RowDataPacket): SellerNotification {
  return {
    id: String(r.id),
    sellerId: String(r.seller_id),
    type: String(r.type),
    title: String(r.title),
    body: r.body != null ? String(r.body) : undefined,
    href: r.href != null ? String(r.href) : undefined,
    meta:
      typeof r.meta === "string"
        ? (JSON.parse(r.meta) as Record<string, unknown>)
        : ((r.meta as Record<string, unknown>) ?? undefined),
    readAt: r.read_at ? toIso(r.read_at) : undefined,
    createdAt: toIso(r.created_at),
  };
}
