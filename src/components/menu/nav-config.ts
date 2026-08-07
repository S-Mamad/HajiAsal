import {
  House,
  Storefront,
  ShoppingBag,
  User,
} from "@phosphor-icons/react";
import type { NavItem } from "@/types";
import { extraNav, resolveNavHref } from "@/lib/nav";
import { hajiasalPath } from "@/lib/paths";
import type {
  DockNavItem,
  MenuNavSource,
  ResolvedMenuNavItem,
} from "./types";

export { extraNav, resolveNavHref };

/** Whether a pathname matches a nav href (exact home, prefix otherwise). */
export function isNavActive(
  pathname: string | null | undefined,
  href: string,
): boolean {
  if (!pathname) return false;
  const home = hajiasalPath();
  if (href === home || href === "/") {
    return pathname === home || pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Merge site settings nav with static extra links, then resolve hrefs. */
export function buildResolvedNavItems(
  siteNav: MenuNavSource[] | NavItem[],
): ResolvedMenuNavItem[] {
  const merged = [...siteNav, ...extraNav];
  return merged.map((item) => ({
    id: item.id,
    label: item.label,
    href: resolveNavHref(item.href),
  }));
}

/** Default mobile bottom-dock tabs. */
export const defaultDockItems: DockNavItem[] = [
  {
    id: "home",
    label: "خانه",
    href: hajiasalPath(),
    icon: House,
    match: (pathname) => pathname === hajiasalPath() || pathname === "/",
  },
  {
    id: "products",
    label: "محصولات",
    href: hajiasalPath("/shop"),
    icon: Storefront,
    match: (pathname) =>
      pathname.startsWith(hajiasalPath("/shop")) ||
      pathname.startsWith(hajiasalPath("/product")),
  },
  {
    id: "cart",
    label: "سبد خرید",
    href: hajiasalPath("/cart"),
    icon: ShoppingBag,
    badge: "cart",
    match: (pathname) => pathname.startsWith(hajiasalPath("/cart")),
  },
  {
    id: "profile",
    label: "حساب",
    href: hajiasalPath("/account"),
    icon: User,
    match: (pathname) =>
      pathname.startsWith(hajiasalPath("/account")) ||
      pathname.startsWith(hajiasalPath("/login")) ||
      pathname.startsWith(hajiasalPath("/register")),
  },
];

/** Footer / utility links shown inside the mobile drawer. */
export const drawerUtilityLinks = [
  { id: "wishlist", label: "علاقه‌مندی‌ها", href: hajiasalPath("/wishlist") },
  { id: "faq", label: "سوالات متداول", href: hajiasalPath("/faq") },
  { id: "contact", label: "تماس با ما", href: hajiasalPath("/contact") },
] as const;
