#!/usr/bin/env node
/**
 * Restore MySQL product stock from src/data/products.json after the
 * COALESCE(NULL,0) soft-zero bug wiped unlimited catalog rows.
 *
 * Usage:
 *   MYSQL_HOST=... MYSQL_USER=... MYSQL_PASSWORD=... MYSQL_DATABASE=... \
 *     node scripts/restore-catalog-stock-from-json.mjs
 *
 * Dry-run (no writes):
 *   ... node scripts/restore-catalog-stock-from-json.mjs --dry-run
 */
import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dryRun = process.argv.includes("--dry-run");

const host = process.env.MYSQL_HOST;
const user = process.env.MYSQL_USER;
const database = process.env.MYSQL_DATABASE;
const password = process.env.MYSQL_PASSWORD ?? "";
const port = Number(process.env.MYSQL_PORT || 3306);

if (!host || !user || !database) {
  console.error("MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE are required");
  process.exit(1);
}

const products = JSON.parse(
  readFileSync(join(root, "src/data/products.json"), "utf8"),
);

const conn = await mysql.createConnection({
  host,
  port,
  user,
  password,
  database,
  charset: "utf8mb4",
});

let updated = 0;
let skipped = 0;

try {
  for (const p of products) {
    if (!p?.id) {
      skipped += 1;
      continue;
    }
    const inStock = p.inStock !== false;
    const stockQty =
      typeof p.stockQty === "number" ? Math.max(0, p.stockQty) : null;
    // Catalog unlimited = NULL stock_qty + in_stock from JSON.
    const nextInStock = inStock && (stockQty == null || stockQty > 0) ? 1 : 0;
    const nextQty = nextInStock === 0 ? 0 : stockQty;

    if (dryRun) {
      console.log(
        `[dry-run] ${p.id} → in_stock=${nextInStock} stock_qty=${nextQty === null ? "NULL" : nextQty}`,
      );
      updated += 1;
      continue;
    }

    const [result] = await conn.execute(
      `UPDATE products
       SET in_stock = ?,
           stock_qty = ?,
           updated_at = CURRENT_TIMESTAMP(3)
       WHERE id = ?`,
      [nextInStock, nextQty, p.id],
    );
    if (result.affectedRows > 0) updated += 1;
    else skipped += 1;
  }
  console.log(
    `${dryRun ? "Would update" : "Updated"} ${updated} products (${skipped} skipped).`,
  );
} finally {
  await conn.end();
}
