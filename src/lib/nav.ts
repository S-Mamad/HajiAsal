import { hajiasalPath } from "@/lib/paths";

/** Resolve relative nav href from site.json to full hajiasal path */
export function resolveNavHref(href: string): string {
  if (!href || href === "/") return hajiasalPath();
  return hajiasalPath(href.startsWith("/") ? href : `/${href}`);
}

export const extraNav = [
  { id: "faq", label: "سوالات", href: hajiasalPath("/faq") },
  { id: "contact", label: "تماس", href: hajiasalPath("/contact") },
] as const;
