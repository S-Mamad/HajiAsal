#!/usr/bin/env node
/**
 * Generate paste-ready MySQL seed SQL for phpMyAdmin (no npm seed on host).
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "mysql-migrations");

function esc(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

function json(value) {
  return esc(JSON.stringify(value));
}

const products = JSON.parse(
  readFileSync(join(root, "src/hajiasal/data/products.json"), "utf8"),
);
const coupons = JSON.parse(
  readFileSync(join(root, "src/hajiasal/data/coupons.json"), "utf8"),
);
const site = JSON.parse(
  readFileSync(join(root, "src/hajiasal/data/site.json"), "utf8"),
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

mkdirSync(outDir, { recursive: true });

// --- 003 categories ---
let sql003 = `-- حاجی عسل — دسته‌بندی‌ها (phpMyAdmin: بعد از 001 و 002 Paste کنید)
SET NAMES utf8mb4;

`;
for (const c of categories) {
  sql003 += `INSERT INTO categories (id, slug, name, sort_order)
VALUES (${esc(c.id)}, ${esc(c.slug)}, ${esc(c.name)}, ${c.sort_order})
ON DUPLICATE KEY UPDATE slug=VALUES(slug), name=VALUES(name), sort_order=VALUES(sort_order);

`;
}
writeFileSync(join(outDir, "003_seed_categories.sql"), sql003, "utf8");

// --- 004 products ---
let sql004 = `-- حاجی عسل — محصولات (${products.length} عدد)
SET NAMES utf8mb4;

`;
for (const p of products) {
  sql004 += `INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  ${esc(p.id)},
  ${esc(p.slug)},
  ${esc(p.title)},
  ${esc(p.shortDescription ?? null)},
  ${esc(p.longDescription ?? null)},
  ${esc(p.category)},
  ${json(p.images ?? [])},
  ${json(p.weightOptions ?? [])},
  ${p.discountPrice != null ? p.discountPrice : "NULL"},
  ${p.inStock ? 1 : 0},
  ${p.isNew ? 1 : 0},
  ${p.isBestseller ? 1 : 0},
  ${p.rating ?? 0},
  ${p.reviewCount ?? 0},
  ${json({ ingredients: p.ingredients, shippingInfo: p.shippingInfo })},
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

`;
}
writeFileSync(join(outDir, "004_seed_products.sql"), sql004, "utf8");

// --- 005 coupons ---
let sql005 = `-- حاجی عسل — کوپن‌ها
SET NAMES utf8mb4;

`;
for (const c of coupons) {
  const code = String(c.code).toUpperCase();
  sql005 += `INSERT INTO coupons (code, type, value, min_order, max_discount, label, active, used_count)
VALUES (
  ${esc(code)},
  ${esc(c.type)},
  ${c.value},
  ${c.minOrder ?? 0},
  ${c.maxDiscount != null ? c.maxDiscount : "NULL"},
  ${esc(c.label ?? null)},
  ${c.active === false ? 0 : 1},
  0
)
ON DUPLICATE KEY UPDATE
  type=VALUES(type), value=VALUES(value), min_order=VALUES(min_order),
  max_discount=VALUES(max_discount), label=VALUES(label), active=VALUES(active);

`;
}
writeFileSync(join(outDir, "005_seed_coupons.sql"), sql005, "utf8");

// --- 006 site settings ---
const sql006 = `-- حاجی عسل — تنظیمات سایت (برند، فوتر، تماس)
SET NAMES utf8mb4;

INSERT INTO site_settings (\`key\`, value)
VALUES ('hajiasal', ${json(site)})
ON DUPLICATE KEY UPDATE value=VALUES(value), updated_at=CURRENT_TIMESTAMP(3);
`;
writeFileSync(join(outDir, "006_seed_site_settings.sql"), sql006, "utf8");

// --- ALL IN ONE for lazy paste ---
const sqlAll = `-- ============================================================
-- حاجی عسل — همه داده‌های فروشگاه (یک‌جا Paste کنید)
-- ترتیب کلی روی هاست:
--   1) 001_schema.sql
--   2) 002_seed_sellers.sql
--   3) این فایل (003 تا 006 یکجا)
-- ============================================================
SET NAMES utf8mb4;

${sql003.replace(/^--.*\nSET NAMES utf8mb4;\n\n?/m, "")}
${sql004.replace(/^--.*\nSET NAMES utf8mb4;\n\n?/m, "")}
${sql005.replace(/^--.*\nSET NAMES utf8mb4;\n\n?/m, "")}
${sql006.replace(/^--.*\nSET NAMES utf8mb4;\n\n?/m, "")}
`;
writeFileSync(join(outDir, "003-006_seed_all_shop_data.sql"), sqlAll, "utf8");

// --- COMPLETE DATABASE: schema + sellers + all shop data ---
const schema = readFileSync(join(outDir, "001_schema.sql"), "utf8");
const sellers = readFileSync(join(outDir, "002_seed_sellers.sql"), "utf8");
const sqlComplete = `-- ============================================================
-- حاجی عسل — دیتابیس کامل MySQL
-- کل این فایل را در phpMyAdmin > SQL یک‌جا Paste و اجرا کنید.
-- شامل: جداول، فروشندگان، دسته‌ها، ۵۰ محصول، کوپن‌ها و تنظیمات
-- ============================================================

${schema}

${sellers}

${sqlAll}
`;
writeFileSync(
  join(outDir, "000_COMPLETE_DATABASE_PASTE_THIS.sql"),
  sqlComplete,
  "utf8",
);

console.log("Generated:");
console.log("  000_COMPLETE_DATABASE_PASTE_THIS.sql (everything)");
console.log("  003_seed_categories.sql");
console.log("  004_seed_products.sql (" + products.length + " products)");
console.log("  005_seed_coupons.sql");
console.log("  006_seed_site_settings.sql");
console.log("  003-006_seed_all_shop_data.sql (combined)");
