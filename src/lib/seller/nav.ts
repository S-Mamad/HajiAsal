import type { Icon } from "@phosphor-icons/react";
import {
  SquaresFour,
  ShoppingBag,
  Package,
  Users,
  Warehouse,
  Wallet,
  ChartBar,
  Lifebuoy,
  Bell,
  ChatCircle,
  Question,
  Percent,
  UserCircle,
  Folder,
  Printer,
  Wrench,
  Gear,
  ClockCounterClockwise,
} from "@phosphor-icons/react";
import { hajiasalPath } from "@/lib/paths";
import {
  canSeller,
  type SellerCapabilitiesMap,
  type SellerCapability,
} from "./capabilities";

export type SellerNavItem = {
  href: string;
  label: string;
  icon: Icon;
  capability?: SellerCapability;
  badgeKey?: "orders" | "tickets" | "notifications" | "inventory" | "products";
};

export type SellerNavGroup = {
  id: string;
  label: string;
  items: SellerNavItem[];
};

const GROUPS: SellerNavGroup[] = [
  {
    id: "main",
    label: "اصلی",
    items: [
      {
        href: hajiasalPath("/seller/dashboard"),
        label: "داشبورد",
        icon: SquaresFour,
      },
    ],
  },
  {
    id: "sales",
    label: "فروش",
    items: [
      {
        href: hajiasalPath("/seller/products"),
        label: "محصولات",
        icon: ShoppingBag,
        capability: "products.manage",
        badgeKey: "products",
      },
      {
        href: hajiasalPath("/seller/orders"),
        label: "سفارشات",
        icon: Package,
        capability: "orders.manage",
        badgeKey: "orders",
      },
      {
        href: hajiasalPath("/seller/inventory"),
        label: "موجودی",
        icon: Warehouse,
        capability: "inventory.manage",
        badgeKey: "inventory",
      },
      {
        href: hajiasalPath("/seller/customers"),
        label: "مشتریان",
        icon: Users,
        capability: "customers.view",
      },
    ],
  },
  {
    id: "finance",
    label: "مالی",
    items: [
      {
        href: hajiasalPath("/seller/wallet"),
        label: "کیف پول",
        icon: Wallet,
        capability: "wallet.view",
      },
      {
        href: hajiasalPath("/seller/reports"),
        label: "گزارش‌ها",
        icon: ChartBar,
        capability: "reports.view",
      },
    ],
  },
  {
    id: "engage",
    label: "تعامل",
    items: [
      {
        href: hajiasalPath("/seller/tickets"),
        label: "تیکت‌ها",
        icon: Lifebuoy,
        capability: "tickets.manage",
        badgeKey: "tickets",
      },
      {
        href: hajiasalPath("/seller/notifications"),
        label: "اعلان‌ها",
        icon: Bell,
        capability: "notifications.view",
        badgeKey: "notifications",
      },
      {
        href: hajiasalPath("/seller/reviews"),
        label: "نظرات",
        icon: ChatCircle,
        capability: "reviews.reply",
      },
      {
        href: hajiasalPath("/seller/qa"),
        label: "پرسش و پاسخ",
        icon: Question,
        capability: "qa.reply",
      },
    ],
  },
  {
    id: "growth",
    label: "رشد",
    items: [
      {
        href: hajiasalPath("/seller/discounts"),
        label: "تخفیف‌ها",
        icon: Percent,
        capability: "discounts.manage",
      },
    ],
  },
  {
    id: "shop",
    label: "فروشگاه",
    items: [
      {
        href: hajiasalPath("/seller/profile"),
        label: "پروفایل",
        icon: UserCircle,
        capability: "profile.manage",
      },
      {
        href: hajiasalPath("/seller/media"),
        label: "فایل‌ها",
        icon: Folder,
        capability: "media.manage",
      },
      {
        href: hajiasalPath("/seller/print-export"),
        label: "چاپ و خروجی",
        icon: Printer,
        capability: "print.export",
      },
      {
        href: hajiasalPath("/seller/tools"),
        label: "ابزارها",
        icon: Wrench,
        capability: "tools.import_export",
      },
      {
        href: hajiasalPath("/seller/settings"),
        label: "تنظیمات",
        icon: Gear,
        capability: "settings.manage",
      },
      {
        href: hajiasalPath("/seller/activity"),
        label: "تاریخچه فعالیت",
        icon: ClockCounterClockwise,
      },
    ],
  },
];

export function getSellerNavGroups(
  capabilities?: SellerCapabilitiesMap | null,
): SellerNavGroup[] {
  return GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (!item.capability) return true;
      return canSeller(capabilities, item.capability);
    }),
  })).filter((g) => g.items.length > 0);
}

export const SELLER_PAGE_TITLES: Record<string, string> = {
  [hajiasalPath("/seller/dashboard")]: "داشبورد",
  [hajiasalPath("/seller/products")]: "محصولات",
  [hajiasalPath("/seller/orders")]: "سفارشات",
  [hajiasalPath("/seller/inventory")]: "موجودی",
  [hajiasalPath("/seller/customers")]: "مشتریان",
  [hajiasalPath("/seller/wallet")]: "کیف پول",
  [hajiasalPath("/seller/earnings")]: "کیف پول",
  [hajiasalPath("/seller/reports")]: "گزارش‌ها",
  [hajiasalPath("/seller/tickets")]: "تیکت‌ها",
  [hajiasalPath("/seller/notifications")]: "اعلان‌ها",
  [hajiasalPath("/seller/reviews")]: "نظرات",
  [hajiasalPath("/seller/qa")]: "پرسش و پاسخ",
  [hajiasalPath("/seller/discounts")]: "تخفیف‌ها",
  [hajiasalPath("/seller/profile")]: "پروفایل",
  [hajiasalPath("/seller/media")]: "فایل‌ها",
  [hajiasalPath("/seller/print-export")]: "چاپ و خروجی",
  [hajiasalPath("/seller/tools")]: "ابزارها",
  [hajiasalPath("/seller/settings")]: "تنظیمات فروشگاه",
  [hajiasalPath("/seller/activity")]: "تاریخچه فعالیت",
};

export function resolveSellerPageTitle(pathname: string): string {
  if (SELLER_PAGE_TITLES[pathname]) return SELLER_PAGE_TITLES[pathname];
  for (const [path, title] of Object.entries(SELLER_PAGE_TITLES)) {
    if (pathname.startsWith(`${path}/`)) return title;
  }
  return "پنل فروشنده";
}
