/**
 * Soft cart stock holds (10 minutes).
 * Catalog stock_qty is not mutated; availability subtracts active holds.
 */

import { randomBytes } from "crypto";
import { canUseFilesystemPersistence } from "@/lib/server/production";
import { CART_MAX_QTY } from "@/lib/product-availability";
import { readJsonFile, writeJsonFile } from "@/lib/server/db";
import {
  isMysqlConfigured,
  mysqlExecute,
  mysqlQuery,
  withMysqlTransaction,
} from "@/lib/server/mysql";
import type { RowDataPacket } from "mysql2";

export const CART_HOLD_TTL_MS = 10 * 60 * 1000;
export const CART_HOLD_COOKIE = "hajiasal_cart_hold";

export type CartHoldRow = {
  sessionId: string;
  productId: string;
  qty: number;
  expiresAt: number;
  updatedAt: number;
};

type HoldFile = { holds: CartHoldRow[] };

const HOLD_FILE = "cart-holds.json";

const memoryHolds: CartHoldRow[] = [];

function nowMs() {
  return Date.now();
}

function isActive(row: CartHoldRow, now = nowMs()) {
  return row.qty > 0 && row.expiresAt > now;
}

function toMs(value: Date | string | number): number {
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  const n = Date.parse(String(value));
  return Number.isFinite(n) ? n : 0;
}

let tableReady: Promise<void> | null = null;

async function ensureHoldTable(): Promise<void> {
  if (!isMysqlConfigured()) return;
  if (!tableReady) {
    tableReady = mysqlExecute(`
      CREATE TABLE IF NOT EXISTS cart_holds (
        session_id VARCHAR(64) NOT NULL,
        product_id VARCHAR(64) NOT NULL,
        qty INT NOT NULL DEFAULT 0,
        expires_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        PRIMARY KEY (session_id, product_id),
        KEY idx_cart_holds_expires (expires_at),
        KEY idx_cart_holds_product (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `).then(() => undefined);
  }
  await tableReady;
}

async function readAllHolds(): Promise<CartHoldRow[]> {
  if (isMysqlConfigured()) {
    try {
      await ensureHoldTable();
      const rows = await mysqlQuery<
        {
          session_id: string;
          product_id: string;
          qty: number;
          expires_at: Date | string | number;
          updated_at: Date | string | number;
        } & RowDataPacket
      >("SELECT session_id, product_id, qty, expires_at, updated_at FROM cart_holds");
      return rows.map((r) => ({
        sessionId: r.session_id,
        productId: r.product_id,
        qty: Number(r.qty) || 0,
        expiresAt: toMs(r.expires_at),
        updatedAt: toMs(r.updated_at),
      }));
    } catch (error) {
      console.error(
        "[cart-holds] mysql read failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }
  if (canUseFilesystemPersistence()) {
    const file = await readJsonFile<HoldFile>(HOLD_FILE, { holds: [] });
    return Array.isArray(file.holds) ? file.holds : [];
  }
  return memoryHolds.slice();
}

/** Persist full snapshot (file / memory only). */
async function writeLocalHolds(holds: CartHoldRow[]): Promise<void> {
  if (canUseFilesystemPersistence()) {
    await writeJsonFile(HOLD_FILE, { holds });
    return;
  }
  memoryHolds.length = 0;
  memoryHolds.push(...holds);
}

/** Replace one session's rows without touching other sessions (MySQL-safe). */
async function replaceSessionHolds(
  sessionId: string,
  rows: CartHoldRow[],
): Promise<void> {
  if (isMysqlConfigured()) {
    try {
      await ensureHoldTable();
      await withMysqlTransaction(async (conn) => {
        await conn.execute("DELETE FROM cart_holds WHERE session_id = ?", [
          sessionId,
        ]);
        for (const row of rows) {
          if (row.qty <= 0) continue;
          await conn.execute(
            `INSERT INTO cart_holds (session_id, product_id, qty, expires_at, updated_at)
             VALUES (?, ?, ?, FROM_UNIXTIME(?/1000), FROM_UNIXTIME(?/1000))
             ON DUPLICATE KEY UPDATE
               qty = VALUES(qty),
               expires_at = VALUES(expires_at),
               updated_at = VALUES(updated_at)`,
            [row.sessionId, row.productId, row.qty, row.expiresAt, row.updatedAt],
          );
        }
      });
      return;
    } catch (error) {
      console.error(
        "[cart-holds] mysql session replace failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  const all = await readAllHolds();
  const next = [
    ...all.filter((h) => h.sessionId !== sessionId),
    ...rows.filter((h) => h.qty > 0),
  ];
  await writeLocalHolds(next);
}

async function deleteSessionHolds(sessionId: string): Promise<void> {
  if (isMysqlConfigured()) {
    try {
      await ensureHoldTable();
      await mysqlExecute("DELETE FROM cart_holds WHERE session_id = ?", [
        sessionId,
      ]);
      return;
    } catch (error) {
      console.error(
        "[cart-holds] mysql session delete failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }
  const all = await readAllHolds();
  await writeLocalHolds(all.filter((h) => h.sessionId !== sessionId));
}

export function newCartHoldSessionId(): string {
  return randomBytes(16).toString("hex");
}

/** Drop expired holds (stock soft-release). */
export async function expireStaleCartHolds(
  now = nowMs(),
): Promise<number> {
  if (isMysqlConfigured()) {
    try {
      await ensureHoldTable();
      const before = await mysqlQuery<{ c: number } & RowDataPacket>(
        "SELECT COUNT(*) AS c FROM cart_holds WHERE expires_at <= FROM_UNIXTIME(?/1000)",
        [now],
      );
      const count = Number(before[0]?.c) || 0;
      if (count > 0) {
        await mysqlExecute(
          "DELETE FROM cart_holds WHERE expires_at <= FROM_UNIXTIME(?/1000)",
          [now],
        );
      }
      return count;
    } catch (error) {
      console.error(
        "[cart-holds] mysql expire failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  const all = await readAllHolds();
  const next = all.filter((h) => isActive(h, now));
  if (next.length === all.length) return 0;
  await writeLocalHolds(next);
  return all.length - next.length;
}

/** Reserved qty for a product (optionally excluding one cart session). */
export async function getHeldQtyForProduct(
  productId: string,
  exceptSessionId?: string | null,
  now = nowMs(),
): Promise<number> {
  await expireStaleCartHolds(now);
  const all = await readAllHolds();
  let sum = 0;
  for (const h of all) {
    if (!isActive(h, now)) continue;
    if (h.productId !== productId) continue;
    if (exceptSessionId && h.sessionId === exceptSessionId) continue;
    sum += h.qty;
  }
  return sum;
}

export async function getSessionHolds(
  sessionId: string,
  now = nowMs(),
): Promise<CartHoldRow[]> {
  await expireStaleCartHolds(now);
  const all = await readAllHolds();
  return all.filter((h) => h.sessionId === sessionId && isActive(h, now));
}

/**
 * Sync holds to match cart lines for one session.
 * New / increased qty gets a fresh 10-minute TTL. Same or lower qty keeps
 * the original expiresAt so idle browsing does not keep renewing the hold.
 */
export async function syncCartHolds(input: {
  sessionId: string;
  lines: Array<{ productId: string; quantity: number }>;
  /** Catalog stock by productId (null = unlimited). */
  stockByProduct: Map<string, number | null>;
}): Promise<{
  holds: CartHoldRow[];
  expiresAt: number | null;
  shortages: Array<{ productId: string; requested: number; held: number }>;
}> {
  const now = nowMs();
  await expireStaleCartHolds(now);
  const freshExpiresAt = now + CART_HOLD_TTL_MS;
  const desired = new Map<string, number>();
  for (const line of input.lines) {
    if (!line.productId || line.quantity <= 0) continue;
    desired.set(
      line.productId,
      Math.min(
        CART_MAX_QTY,
        (desired.get(line.productId) ?? 0) + Math.floor(line.quantity),
      ),
    );
  }

  const all = await readAllHolds();
  const others = all.filter(
    (h) => h.sessionId !== input.sessionId && isActive(h, now),
  );
  const previousByProduct = new Map(
    all
      .filter((h) => h.sessionId === input.sessionId && isActive(h, now))
      .map((h) => [h.productId, h] as const),
  );
  const nextSession: CartHoldRow[] = [];
  const shortages: Array<{
    productId: string;
    requested: number;
    held: number;
  }> = [];

  for (const [productId, requested] of desired) {
    const stock = input.stockByProduct.get(productId);
    let held = requested;
    if (typeof stock === "number") {
      const othersHeld = others
        .filter((h) => h.productId === productId)
        .reduce((s, h) => s + h.qty, 0);
      const room = Math.max(0, stock - othersHeld);
      if (requested > room) {
        held = room;
        shortages.push({ productId, requested, held });
      }
    }
    if (held > 0) {
      const prev = previousByProduct.get(productId);
      // Keep clock on same/lower qty; renew only when hold is new or qty rises.
      const expiresAt =
        prev && held <= prev.qty ? prev.expiresAt : freshExpiresAt;
      nextSession.push({
        sessionId: input.sessionId,
        productId,
        qty: held,
        expiresAt,
        updatedAt: now,
      });
    }
  }

  await replaceSessionHolds(input.sessionId, nextSession);

  const soonest =
    nextSession.length > 0
      ? Math.min(...nextSession.map((h) => h.expiresAt))
      : null;

  return {
    holds: nextSession,
    expiresAt: soonest,
    shortages,
  };
}

/** Remove session holds without restoring (order is being paid). */
export async function consumeCartHoldsForSession(
  sessionId: string,
): Promise<void> {
  await deleteSessionHolds(sessionId);
}

/** Drop session holds (cart clear / logout). Soft stock returns to pool. */
export async function releaseCartHoldsForSession(
  sessionId: string,
): Promise<void> {
  await consumeCartHoldsForSession(sessionId);
}
