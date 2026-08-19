import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  createMedia,
  listBanners,
  listBrands,
  listMedia,
} from "@/lib/server/admin-platform-store";
import { getAllProductsAsync } from "@/lib/server/products-store";
import { getSiteSettings } from "@/lib/server/site-settings";
import { BRAND_LOGO_PATH } from "@/lib/brand-assets";

const IMAGE_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".svg",
]);

type ImageMeta = {
  originalName: string;
  folder: string | null;
};

function mimeFromExt(ext: string): string {
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".svg") return "image/svg+xml";
  return "image/jpeg";
}

function isImageUrl(url: string): boolean {
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) return false;
  const base = url.split("?")[0] ?? "";
  if (base.startsWith("http://") || base.startsWith("https://")) return true;
  if (!base.startsWith("/")) return false;
  return IMAGE_EXT.has(path.extname(base).toLowerCase());
}

function addUrl(
  map: Map<string, ImageMeta>,
  url: string | null | undefined,
  folder: string | null,
): void {
  const clean = (url ?? "").split("?")[0]?.trim();
  if (!clean || !isImageUrl(clean)) return;
  const originalName = path.basename(clean);
  if (!map.has(clean)) {
    map.set(clean, { originalName, folder });
  }
}

async function walkPublicImages(
  absDir: string,
  urlPrefix: string,
): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await readdir(absDir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const abs = path.join(absDir, entry.name);
    const nextPrefix = `${urlPrefix}/${entry.name}`.replace(/\/+/g, "/");
    if (entry.isDirectory()) {
      out.push(...(await walkPublicImages(abs, nextPrefix)));
      continue;
    }
    if (IMAGE_EXT.has(path.extname(entry.name).toLowerCase())) {
      out.push(nextPrefix);
    }
  }
  return out;
}

export async function collectSiteImageUrls(): Promise<Map<string, ImageMeta>> {
  const map = new Map<string, ImageMeta>();
  const settings = await getSiteSettings();

  addUrl(map, settings.hero.image, "site");
  addUrl(map, settings.hero.imageMobile, "site");
  addUrl(map, settings.brandStory.image, "site");
  addUrl(map, settings.homeSections?.sellerBanner?.image, "site");

  for (const cat of settings.categories ?? []) {
    addUrl(map, cat.image, "categories");
  }

  for (const product of await getAllProductsAsync()) {
    for (const img of product.images ?? []) {
      addUrl(map, img, "products");
    }
    addUrl(map, product.seo?.ogImage, "products");
    addUrl(map, product.seo?.twitterImage, "products");
  }

  for (const brand of await listBrands()) {
    addUrl(map, brand.logo, "brands");
  }

  for (const banner of await listBanners()) {
    addUrl(map, banner.imageUrl, "banners");
    addUrl(map, banner.imageMobileUrl, "banners");
  }

  addUrl(map, BRAND_LOGO_PATH, "brand");

  const publicRoot = path.join(process.cwd(), "public");
  for (const prefix of ["/images", "/uploads"] as const) {
    const rel = prefix.slice(1);
    const urls = await walkPublicImages(path.join(publicRoot, rel), prefix);
    for (const url of urls) {
      addUrl(map, url, prefix === "/uploads" ? "uploads" : "static");
    }
  }

  return map;
}

/** Register site images missing from the media library. Returns count added. */
export async function syncSiteMediaToLibrary(): Promise<number> {
  const existing = await listMedia();
  const known = new Set(existing.map((item) => item.url.split("?")[0]));
  const candidates = await collectSiteImageUrls();
  let added = 0;

  for (const [url, meta] of candidates) {
    if (known.has(url)) continue;
    const ext = path.extname(url).toLowerCase();
    await createMedia({
      filename: meta.originalName,
      originalName: meta.originalName,
      mimeType: mimeFromExt(ext),
      sizeBytes: 0,
      url,
      folder: meta.folder,
    });
    known.add(url);
    added += 1;
  }

  return added;
}
