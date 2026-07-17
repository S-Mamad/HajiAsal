#!/usr/bin/env node
/**
 * Seed products + categories into MySQL.
 * Usage:
 *   MYSQL_HOST=... MYSQL_USER=... MYSQL_PASSWORD=... MYSQL_DATABASE=... node scripts/seed-products-to-mysql.mjs
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

const products = JSON.parse(
  readFileSync(join(root, "src/hajiasal/data/products.json"), "utf8"),
);

const categoryMap = new Map();
for (const p of products) {
  if (!categoryMap.has(p.category)) {
    categoryMap.set(p.category, {
      id: p.category,
      slug: p.category,
      name: p.categoryLabel,
      sort_order: categoryMap.size,
    });
  }
}

const categories = [...categoryMap.values()];
const conn = await mysql.createConnection({
  host,
  port,
  user,
  password,
  database,
  charset: "utf8mb4",
});

try {
  console.log(`Seeding ${categories.length} categories...`);
  for (const c of categories) {
    await conn.execute(
      `INSERT INTO categories (id, slug, name, sort_order)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE slug=VALUES(slug), name=VALUES(name), sort_order=VALUES(sort_order)`,
      [c.id, c.slug, c.name, c.sort_order],
    );
  }

  console.log(`Seeding ${products.length} products...`);
  for (const p of products) {
    await conn.execute(
      `INSERT INTO products (
         id, slug, title, short_description, description, category_id,
         images, weight_options, discount_price, in_stock, featured, bestseller,
         rating, review_count, honey_meta, approval_status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')
       ON DUPLICATE KEY UPDATE
         slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
         description=VALUES(description), category_id=VALUES(category_id),
         images=VALUES(images), weight_options=VALUES(weight_options),
         discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
         featured=VALUES(featured), bestseller=VALUES(bestseller),
         rating=VALUES(rating), review_count=VALUES(review_count),
         honey_meta=VALUES(honey_meta)`,
      [
        p.id,
        p.slug,
        p.title,
        p.shortDescription ?? null,
        p.longDescription ?? null,
        p.category,
        JSON.stringify(p.images ?? []),
        JSON.stringify(p.weightOptions ?? []),
        p.discountPrice ?? null,
        p.inStock ? 1 : 0,
        p.isNew ? 1 : 0,
        p.isBestseller ? 1 : 0,
        p.rating ?? 0,
        p.reviewCount ?? 0,
        JSON.stringify({
          ingredients: p.ingredients,
          shippingInfo: p.shippingInfo,
        }),
      ],
    );
  }

  console.log("Done.");
} finally {
  await conn.end();
}
