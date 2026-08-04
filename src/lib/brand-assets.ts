import { sitePublicUrl } from "@/lib/paths";

/** Public path for the transparent calligraphic mark. */
export const BRAND_LOGO_PATH = "/images/hajiasal/brand/logo-mark.png";

export function getBrandLogoAbsoluteUrl(): string {
  return `${sitePublicUrl()}${BRAND_LOGO_PATH}`;
}

/** Client-side: same-origin absolute URL for print windows. */
export function brandLogoPrintSrc(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${BRAND_LOGO_PATH}`;
  }
  return BRAND_LOGO_PATH;
}
