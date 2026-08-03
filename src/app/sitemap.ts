import type { MetadataRoute } from "next";
import { getAllSlugsAsync } from "@/lib/server/products-store";
import { hajiasalAbsoluteUrl } from "@/lib/paths";

const routes = [
  "",
  "/shop",
  "/about",
  "/reviews",
  "/contact",
  "/faq",
  "/track-order",
  "/authenticity",
  "/privacy",
  "/terms",
  "/shipping",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = routes.map((route) => ({
    url: hajiasalAbsoluteUrl(route),
    lastModified: now,
    changeFrequency: route === "" || route === "/shop" ? "daily" : "weekly",
    priority: route === "" ? 1 : route === "/shop" ? 0.9 : 0.7,
  }));

  let productSlugs: string[] = [];
  try {
    productSlugs = await getAllSlugsAsync();
  } catch {
    productSlugs = [];
  }

  const productEntries: MetadataRoute.Sitemap = productSlugs.map((slug) => ({
    url: hajiasalAbsoluteUrl(`/product/${slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...productEntries];
}
