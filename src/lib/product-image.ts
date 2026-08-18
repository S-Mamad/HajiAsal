/**
 * Map legacy catalog image paths to on-disk hajiasal assets.
 * Seed data still references `/images/products/*.jpg` while files live under
 * `/images/hajiasal/products/*.svg`.
 */
export function resolveProductImageSrc(src: string): string {
  if (!src) return "/images/hajiasal/placeholder.svg";

  const legacy = src.match(
    /^\/images\/products\/(p\d+)(?:-alt)?\.(jpe?g|png|webp|svg)$/i,
  );
  if (legacy) {
    return `/images/hajiasal/products/${legacy[1].toLowerCase()}.svg`;
  }

  return src;
}

/** Designed 800×800 illustrations already include the studio canvas. */
export function isCatalogIllustration(src: string): boolean {
  return /\.svg(?:$|\?)/i.test(resolveProductImageSrc(src));
}

export type ProductImageFit = {
  scale: number;
  x: number;
  y: number;
};

export const DEFAULT_IMAGE_FIT: ProductImageFit = {
  scale: 1,
  x: 0,
  y: 0,
};

export const IMAGE_FIT_SCALE_MIN = 1;
export const IMAGE_FIT_SCALE_MAX = 3;
export const IMAGE_FIT_PAN_MIN = -50;
export const IMAGE_FIT_PAN_MAX = 50;

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function roundFit(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function clampImageFit(input: unknown): ProductImageFit {
  const raw =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const scale = clampNumber(
    typeof raw.scale === "number" ? raw.scale : DEFAULT_IMAGE_FIT.scale,
    IMAGE_FIT_SCALE_MIN,
    IMAGE_FIT_SCALE_MAX,
  );
  const x = clampNumber(
    typeof raw.x === "number" ? raw.x : DEFAULT_IMAGE_FIT.x,
    IMAGE_FIT_PAN_MIN,
    IMAGE_FIT_PAN_MAX,
  );
  const y = clampNumber(
    typeof raw.y === "number" ? raw.y : DEFAULT_IMAGE_FIT.y,
    IMAGE_FIT_PAN_MIN,
    IMAGE_FIT_PAN_MAX,
  );
  return {
    scale: roundFit(scale),
    x: roundFit(x),
    y: roundFit(y),
  };
}

export function isCustomImageFit(
  fit?: ProductImageFit | null,
): fit is ProductImageFit {
  if (!fit) return false;
  return (
    Math.abs(fit.scale - 1) >= 0.01 ||
    Math.abs(fit.x) >= 0.05 ||
    Math.abs(fit.y) >= 0.05
  );
}

export function parseImageFits(
  raw: unknown,
): Record<string, ProductImageFit> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Record<string, ProductImageFit> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!key) continue;
    const fit = clampImageFit(value);
    if (isCustomImageFit(fit)) out[key] = fit;
  }
  return Object.keys(out).length ? out : undefined;
}

export function pruneImageFits(
  fits: Record<string, ProductImageFit> | undefined,
  images: string[],
): Record<string, ProductImageFit> | undefined {
  if (!fits || images.length === 0) return undefined;
  const allowed = new Set(images.filter(Boolean));
  const out: Record<string, ProductImageFit> = {};
  for (const src of allowed) {
    const fit = fits[src];
    if (!fit) continue;
    const clamped = clampImageFit(fit);
    if (isCustomImageFit(clamped)) out[src] = clamped;
  }
  return Object.keys(out).length ? out : undefined;
}

export function writeImageFit(
  fits: Record<string, ProductImageFit> | undefined,
  src: string,
  next: ProductImageFit,
): Record<string, ProductImageFit> {
  const copy = { ...(fits ?? {}) };
  if (!src) return copy;
  const clamped = clampImageFit(next);
  if (!isCustomImageFit(clamped)) delete copy[src];
  else copy[src] = clamped;
  return copy;
}

export function imageFitForSrc(
  fits: Record<string, ProductImageFit> | undefined,
  src: string | undefined,
): ProductImageFit | undefined {
  if (!src || !fits) return undefined;
  const fit = fits[src];
  return isCustomImageFit(fit) ? clampImageFit(fit) : undefined;
}

export function productImageFitStyle(
  fit?: ProductImageFit | null,
): { transform: string; transformOrigin: string } | undefined {
  if (!isCustomImageFit(fit)) return undefined;
  return {
    transform: `translate(${fit.x}%, ${fit.y}%) scale(${fit.scale})`,
    transformOrigin: "center center",
  };
}

export function catalogImageFit(
  src: string,
  fit?: ProductImageFit | null,
): "cover" | "contain" {
  if (isCustomImageFit(fit)) return "cover";
  return isCatalogIllustration(src) ? "cover" : "contain";
}

/** Square studio frame for photos; edge-to-edge for illustration templates. */
export function catalogMediaClass(
  src: string,
  fit?: ProductImageFit | null,
): string {
  if (isCustomImageFit(fit)) {
    return "product-media product-media--fitted";
  }
  return isCatalogIllustration(src)
    ? "product-media product-media--cover"
    : "product-media product-media--studio";
}
