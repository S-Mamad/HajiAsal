#!/usr/bin/env node
/**
 * Seed products + categories from products.json into Supabase.
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-products-to-supabase.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

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
console.log(`Seeding ${categories.length} categories...`);

const { error: catError } = await supabase.from("categories").upsert(categories);
if (catError) {
  console.error("Categories error:", catError.message);
  process.exit(1);
}

const rows = products.map((p) => ({
  id: p.id,
  slug: p.slug,
  title: p.title,
  short_description: p.shortDescription,
  description: p.longDescription,
  category_id: p.category,
  images: p.images,
  weight_options: p.weightOptions,
  discount_price: p.discountPrice ?? null,
  in_stock: p.inStock,
  featured: p.isNew ?? false,
  bestseller: p.isBestseller ?? false,
  rating: p.rating ?? 0,
  review_count: p.reviewCount ?? 0,
  honey_meta: {
    ingredients: p.ingredients,
    shippingInfo: p.shippingInfo,
  },
}));

console.log(`Seeding ${rows.length} products...`);
const { error: prodError } = await supabase.from("products").upsert(rows);
if (prodError) {
  console.error("Products error:", prodError.message);
  process.exit(1);
}

console.log("Done.");
