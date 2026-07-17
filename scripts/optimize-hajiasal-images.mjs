import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const assetsDir =
  process.env.HAJIASAL_ASSETS_DIR ??
  path.join(process.env.USERPROFILE ?? "", ".cursor", "projects", "f-VS-Code-File-Mine-Site", "assets");
const outBase = path.join(root, "public", "images", "hajiasal");

const mappings = [
  { src: "hero-source.png", out: "hero.webp", w: 1920, q: 82 },
  { src: "og-source.png", out: "og/og.webp", w: 1200, q: 85 },
  { src: "about-workshop-source.png", out: "about/workshop.webp", w: 1200, q: 82 },
  { src: "hero-source.png", out: "placeholder.webp", w: 800, q: 75 },
  { src: "cat-mountain-source.png", out: "categories/mountain.webp", w: 800, q: 82 },
  { src: "cat-thyme-source.png", out: "categories/thyme.webp", w: 800, q: 82 },
  { src: "cat-multifloral-source.png", out: "categories/multifloral.webp", w: 800, q: 82 },
  { src: "cat-royal-jelly-source.png", out: "categories/royal-jelly.webp", w: 800, q: 82 },
  { src: "cat-honeycomb-source.png", out: "categories/honeycomb.webp", w: 800, q: 82 },
  { src: "cat-specialty-source.png", out: "categories/specialty.webp", w: 800, q: 82 },
  { src: "cat-gift-set-source.png", out: "categories/gift-set.webp", w: 800, q: 82 },
];

const categorySources = {
  mountain: "cat-mountain-source.png",
  thyme: "cat-thyme-source.png",
  multifloral: "cat-multifloral-source.png",
  "royal-jelly": "cat-royal-jelly-source.png",
  honeycomb: "cat-honeycomb-source.png",
  specialty: "cat-specialty-source.png",
  "gift-set": "cat-gift-set-source.png",
};

async function toWebp(input, output, width, quality, mod = {}) {
  const outPath = path.join(outBase, output);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  let pipeline = sharp(input).resize(width, null, { withoutEnlargement: true, fit: "inside" });
  if (mod.rotate) pipeline = pipeline.rotate(mod.rotate);
  if (mod.brightness) pipeline = pipeline.modulate({ brightness: mod.brightness });
  if (mod.saturation) pipeline = pipeline.modulate({ saturation: mod.saturation });
  await pipeline.webp({ quality, effort: 4 }).toFile(outPath);
  const stat = fs.statSync(outPath);
  console.log(`✓ ${output} (${Math.round(stat.size / 1024)}KB)`);
}

async function main() {
  for (const m of mappings) {
    const input = path.join(assetsDir, m.src);
    if (!fs.existsSync(input)) {
      console.warn(`skip missing: ${m.src}`);
      continue;
    }
    await toWebp(input, m.out, m.w, m.q);
  }

  const products = JSON.parse(
    fs.readFileSync(path.join(root, "src", "hajiasal", "data", "products.json"), "utf8")
  );

  const mods = [
    {},
    { brightness: 1.05 },
    { brightness: 0.95, saturation: 1.1 },
    { rotate: 1 },
    { brightness: 1.08, saturation: 0.95 },
    { rotate: -1, brightness: 1.02 },
  ];

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const catSrc = categorySources[p.category] ?? "cat-mountain-source.png";
    const input = path.join(assetsDir, catSrc);
    const mod = mods[i % mods.length];
    await toWebp(input, `products/${p.id}.webp`, 900, 82, mod);
  }

  console.log(`\nDone: ${products.length} products + ${mappings.length} assets`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
