import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BRAND_LOGO_PATH,
  getBrandLogoAbsoluteUrl,
} from "@/lib/brand-assets";

const LOGO_RELATIVE_FILE = join(
  "public",
  "images",
  "hajiasal",
  "brand",
  "logo-mark.png",
);

let cachedDataUri: string | null | undefined;

/**
 * Embeddable logo for invoices / print HTML (works offline & in saved files).
 * Falls back to absolute site URL if the file cannot be read.
 */
export function getBrandLogoDataUri(): string {
  if (cachedDataUri !== undefined) {
    return cachedDataUri ?? getBrandLogoAbsoluteUrl();
  }
  try {
    const buf = readFileSync(join(process.cwd(), LOGO_RELATIVE_FILE));
    cachedDataUri = `data:image/png;base64,${buf.toString("base64")}`;
    return cachedDataUri;
  } catch {
    cachedDataUri = null;
    return getBrandLogoAbsoluteUrl();
  }
}

export { BRAND_LOGO_PATH };
