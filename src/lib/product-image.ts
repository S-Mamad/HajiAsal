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
