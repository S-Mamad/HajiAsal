import {
  User,
  Package,
  MapPin,
  Heart,
  SquaresFour,
  ChatCircle,
  Storefront,
  type Icon,
} from "@phosphor-icons/react";
import { hajiasalPath } from "@/lib/paths";

export type AccountNavLink = {
  href: string;
  label: string;
  shortLabel: string;
  icon: Icon;
  exact?: boolean;
};

/** Link back to the storefront — shown prominently in account chrome */
export const ACCOUNT_STORE_LINK = {
  href: hajiasalPath("/"),
  label: "بازگشت به فروشگاه",
  shortLabel: "فروشگاه",
  icon: Storefront,
} as const;

export const ACCOUNT_NAV_LINKS: readonly AccountNavLink[] = [
  {
    href: hajiasalPath("/account"),
    label: "خلاصه حساب",
    shortLabel: "خلاصه",
    icon: SquaresFour,
    exact: true,
  },
  {
    href: hajiasalPath("/account/orders"),
    label: "سفارش‌ها",
    shortLabel: "سفارش",
    icon: Package,
  },
  {
    href: hajiasalPath("/account/tickets"),
    label: "پشتیبانی",
    shortLabel: "پشتیبانی",
    icon: ChatCircle,
  },
  {
    href: hajiasalPath("/account/addresses"),
    label: "آدرس‌ها",
    shortLabel: "آدرس",
    icon: MapPin,
  },
  {
    href: hajiasalPath("/account/wishlist"),
    label: "علاقه‌مندی",
    shortLabel: "علاقه",
    icon: Heart,
  },
  {
    href: hajiasalPath("/account/profile"),
    label: "پروفایل",
    shortLabel: "پروفایل",
    icon: User,
  },
] as const;

/** Primary tabs for mobile bottom bar (keeps bar readable) */
export const ACCOUNT_MOBILE_NAV_LINKS: readonly AccountNavLink[] =
  ACCOUNT_NAV_LINKS.filter(
    (link) =>
      link.href !== hajiasalPath("/account/addresses") &&
      link.href !== hajiasalPath("/account/wishlist"),
  );

export function isAccountNavActive(
  pathname: string,
  href: string,
  exact?: boolean,
) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
