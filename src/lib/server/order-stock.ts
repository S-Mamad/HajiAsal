import type { PoolConnection, ResultSetHeader } from "mysql2/promise";
import type { CartItem } from "@/types";
import { isMysqlConfigured, mysqlExecute } from "./mysql";
import { getProductByIdAsync, updateProductAsync } from "./products-store";

function qtyByProduct(items: CartItem[]): Map<string, { qty: number; title: string }> {
  const map = new Map<string, { qty: number; title: string }>();
  for (const item of items) {
    const prev = map.get(item.productId);
    map.set(item.productId, {
      qty: (prev?.qty ?? 0) + item.quantity,
      title: item.title || prev?.title || item.productId,
    });
  }
  return map;
}

/**
 * Decrement catalog stock after a paid confirmation.
 * Never drives stock negative. Returns product titles that could not fully cover qty.
 */
export async function decrementStockForPaidOrder(
  items: CartItem[],
  conn?: PoolConnection,
): Promise<string[]> {
  const shortages: string[] = [];
  const grouped = qtyByProduct(items);

  for (const [productId, { qty, title }] of grouped) {
    if (qty <= 0) continue;

    if (isMysqlConfigured()) {
      try {
        // NULL stock_qty = unlimited catalog stock. Never COALESCE(NULL,0):
        // that falsely treats unlimited as zero and soft-zeros the whole catalog.
        const sql = `UPDATE products
          SET stock_qty = GREATEST(0, stock_qty - ?),
              in_stock = CASE
                WHEN GREATEST(0, stock_qty - ?) > 0 THEN 1
                ELSE 0
              END
          WHERE id = ?
            AND stock_qty IS NOT NULL
            AND stock_qty >= ?`;
        const params = [qty, qty, productId, qty];
        const result = conn
          ? (
              await conn.execute<ResultSetHeader>(sql, params)
            )[0]
          : await mysqlExecute(sql, params);

        if (result.affectedRows === 0) {
          // Tracked stock that could not cover qty: clamp to zero (never touch NULL/unlimited).
          const softSql = `UPDATE products
            SET stock_qty = 0, in_stock = 0
            WHERE id = ?
              AND stock_qty IS NOT NULL
              AND stock_qty < ?`;
          const softResult = conn
            ? (
                await conn.execute<ResultSetHeader>(softSql, [productId, qty])
              )[0]
            : await mysqlExecute(softSql, [productId, qty]);
          if (softResult.affectedRows > 0) {
            shortages.push(title);
          }
          // affectedRows === 0 here means unlimited (NULL) stock or missing row —
          // do not invent a shortage for unlimited catalog items.
        }
        continue;
      } catch (error) {
        console.error(
          "[order-stock] mysql decrement failed:",
          error instanceof Error ? error.message : error,
        );
        shortages.push(title);
        continue;
      }
    }

    const product = await getProductByIdAsync(productId, { allowHidden: true });
    if (!product) {
      shortages.push(title);
      continue;
    }
    const current =
      typeof product.stockQty === "number" ? product.stockQty : null;
    if (current == null) {
      // Unlimited / unset stock — nothing to decrement.
      continue;
    }
    if (current < qty) {
      shortages.push(title);
      await updateProductAsync(
        productId,
        { stockQty: 0, inStock: false },
        { createRevision: false, revisionNote: "stock after paid order (shortage)" },
      );
      continue;
    }
    const next = current - qty;
    await updateProductAsync(
      productId,
      { stockQty: next, inStock: next > 0 },
      {
        createRevision: false,
        revisionNote: "stock after paid order",
      },
    );
  }

  return shortages;
}

/**
 * Restore catalog stock after refund / cancel of a previously confirmed order.
 * Aggregates by productId (same as decrement). Safe to call once per order.
 */
export async function restoreStockForPaidOrder(
  items: CartItem[],
  conn?: PoolConnection,
): Promise<void> {
  const grouped = qtyByProduct(items);

  for (const [productId, { qty }] of grouped) {
    if (qty <= 0) continue;

    if (isMysqlConfigured()) {
      try {
        // Only restore tracked (non-NULL) stock. COALESCE(NULL,0)+qty would
        // turn unlimited catalog rows into finite stock after refunds.
        const sql = `UPDATE products
          SET stock_qty = stock_qty + ?,
              in_stock = 1
          WHERE id = ?
            AND stock_qty IS NOT NULL`;
        const params = [qty, productId];
        if (conn) {
          await conn.execute(sql, params);
        } else {
          await mysqlExecute(sql, params);
        }
        continue;
      } catch (error) {
        console.error(
          "[order-stock] mysql restore failed:",
          error instanceof Error ? error.message : error,
        );
        continue;
      }
    }

    const product = await getProductByIdAsync(productId, { allowHidden: true });
    if (!product) continue;
    const current =
      typeof product.stockQty === "number" ? product.stockQty : null;
    if (current == null) continue;
    const next = current + qty;
    await updateProductAsync(
      productId,
      { stockQty: next, inStock: next > 0 },
      {
        createRevision: false,
        revisionNote: "stock restore after refund/cancel",
      },
    );
  }
}
