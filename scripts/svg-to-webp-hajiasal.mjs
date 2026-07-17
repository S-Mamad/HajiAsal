import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const svgBase = path.join(root, "public", "images", "hajiasal");
const outBase = svgBase;

async function svgToWebp(svgPath, webpRel, width, quality = 82) {
  const outPath = path.join(outBase, webpRel);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  if (!fs.existsSync(svgPath)) {
    console.warn(`skip missing: ${svgPath}`);
    return false;
  }
  await sharp(svgPath)
    .resize(width, null, { fit: "inside" })
    .webp({ quality, effort: 4 })
    .toFile(outPath);
  console.log(`✓ ${webpRel}`);
  return true;
}

async function main() {
  const heroSvg = path.join(svgBase, "hero.svg");
  await svgToWebp(heroSvg, "hero.webp", 1920);
  await svgToWebp(heroSvg, "placeholder.webp", 800, 75);
  await svgToWebp(heroSvg, "og/og.webp", 1200, 85);
  await svgToWebp(heroSvg, "about/workshop.webp", 1200);

  const categories = [
    "mountain",
    "thyme",
    "multifloral",
    "royal-jelly",
    "honeycomb",
    "specialty",
    "gift-set",
  ];
  for (const cat of categories) {
    await svgToWebp(
      path.join(svgBase, "categories", `${cat}.svg`),
      `categories/${cat}.webp`,
      800,
    );
  }

  const productsDir = path.join(svgBase, "products");
  if (fs.existsSync(productsDir)) {
    const svgs = fs.readdirSync(productsDir).filter((f) => f.endsWith(".svg"));
    for (const file of svgs) {
      const id = file.replace(".svg", "");
      const svgPath = path.join(productsDir, file);
      await svgToWebp(svgPath, `products/${id}.webp`, 900);
      await sharp(svgPath)
        .resize(900, null, { fit: "inside" })
        .modulate({ brightness: 1.05, saturation: 1.08 })
        .webp({ quality: 82, effort: 4 })
        .toFile(path.join(outBase, "products", `${id}-alt.webp`));
      console.log(`✓ products/${id}-alt.webp`);
    }
  }

  console.log("\nDone: WebP files generated from SVG sources.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
