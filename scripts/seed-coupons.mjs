#!/usr/bin/env node
/**
 * Seed coupons into MySQL.
 */
import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const host = process.env.MYSQL_HOST;
const user = process.env.MYSQL_USER;
const database = process.env.MYSQL_DATABASE;
const password = process.env.MYSQL_PASSWORD ?? "";
const port = Number(process.env.MYSQL_PORT || 3306);

if (!host || !user || !database) {
  console.error("MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE are required");
  process.exit(1);
}

const coupons = JSON.parse(
  readFileSync(join(root, "src/hajiasal/data/coupons.json"), "utf8"),
);

const conn = await mysql.createConnection({
  host,
  port,
  user,
  password,
  database,
  charset: "utf8mb4",
});

try {
  console.log(`Seeding ${coupons.length} coupons...`);
  for (const c of coupons) {
    const code = String(c.code).toUpperCase();
    await conn.execute(
      `INSERT INTO coupons (code, type, value, min_order, max_discount, label, active, used_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE
         type=VALUES(type), value=VALUES(value), min_order=VALUES(min_order),
         max_discount=VALUES(max_discount), label=VALUES(label), active=VALUES(active)`,
      [
        code,
        c.type,
        c.value,
        c.minOrder ?? 0,
        c.maxDiscount ?? null,
        c.label ?? null,
        c.active === false ? 0 : 1,
      ],
    );
  }
  console.log("Done.");
} finally {
  await conn.end();
}
