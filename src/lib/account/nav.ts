import {
  User,
  Package,
  MapPin,
  Heart,
  House,
  ChatCircle,
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

export const ACCOUNT_NAV_LINKS: readonly AccountNavLink[] = [
  {
    href: hajiasalPath("/account"),
    label: "خلاصه",
    shortLabel: "خلاصه",
    icon: House,
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

export function isAccountNavActive(
  pathname: string,
  href: string,
  exact?: boolean,
) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
