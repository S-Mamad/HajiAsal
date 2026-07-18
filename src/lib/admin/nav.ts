import type { Icon } from "@phosphor-icons/react";
import {
  SquaresFour,
  Package,
  ShoppingBag,
  Tag,
  Warehouse,
  Users,
  Star,
  Ticket,
  Envelope,
  Newspaper,
  Article,
  ChartBar,
  Gear,
  Storefront,
  Handshake,
  Medal,
  Images,
  FlagBanner,
  FileText,
  ChatCircleDots,
  Headset,
  Bell,
  UserGear,
  Scroll,
} from "@phosphor-icons/react";
import { hajiasalPath } from "@/lib/paths";
import { can, type AdminPermission, type AdminRole } from "./permissions";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: Icon;
  permission: AdminPermission;
  badgeKey?: "tickets" | "messages" | "qa";
}

export interface AdminNavGroup {
  id: string;
  label: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "overview",
    label: "نمای کلی",
    items: [
      {
        href: hajiasalPath("/admin/dashboard"),
        label: "داشبورد",
        icon: SquaresFour,
        permission: "dashboard.view",
      },
    ],
  },
  {
    id: "catalog",
    label: "کاتالوگ",
    items: [
      {
        href: hajiasalPath("/admin/products"),
        label: "محصولات",
        icon: ShoppingBag,
        permission: "products.view",
      },
      {
        href: hajiasalPath("/admin/categories"),
        label: "دسته‌بندی‌ها",
        icon: Tag,
        permission: "categories.view",
      },
      {
        href: hajiasalPath("/admin/brands"),
        label: "برندها",
        icon: Medal,
        permission: "brands.view",
      },
      {
        href: hajiasalPath("/admin/inventory"),
        label: "موجودی",
        icon: Warehouse,
        permission: "inventory.view",
      },
      {
        href: hajiasalPath("/admin/sellers"),
        label: "فروشندگان",
        icon: Handshake,
        permission: "sellers.view",
      },
    ],
  },
  {
    id: "sales",
    label: "فروش",
    items: [
      {
        href: hajiasalPath("/admin/orders"),
        label: "سفارش‌ها",
        icon: Package,
        permission: "orders.view",
      },
      {
        href: hajiasalPath("/admin/customers"),
        label: "مشتریان",
        icon: Users,
        permission: "customers.view",
      },
      {
        href: hajiasalPath("/admin/coupons"),
        label: "کوپن‌ها",
        icon: Ticket,
        permission: "coupons.view",
      },
    ],
  },
  {
    id: "engagement",
    label: "تعامل",
    items: [
      {
        href: hajiasalPath("/admin/reviews"),
        label: "نظرات",
        icon: Star,
        permission: "reviews.view",
      },
      {
        href: hajiasalPath("/admin/qa"),
        label: "پرسش و پاسخ",
        icon: ChatCircleDots,
        permission: "qa.view",
        badgeKey: "qa",
      },
      {
        href: hajiasalPath("/admin/messages"),
        label: "پیام‌ها",
        icon: Envelope,
        permission: "messages.view",
        badgeKey: "messages",
      },
      {
        href: hajiasalPath("/admin/tickets"),
        label: "تیکت‌ها",
        icon: Headset,
        permission: "tickets.view",
        badgeKey: "tickets",
      },
      {
        href: hajiasalPath("/admin/newsletter"),
        label: "خبرنامه",
        icon: Newspaper,
        permission: "newsletter.view",
      },
    ],
  },
  {
    id: "content",
    label: "محتوا",
    items: [
      {
        href: hajiasalPath("/admin/articles"),
        label: "مقالات",
        icon: Article,
        permission: "articles.view",
      },
      {
        href: hajiasalPath("/admin/pages"),
        label: "صفحات",
        icon: FileText,
        permission: "pages.view",
      },
      {
        href: hajiasalPath("/admin/banners"),
        label: "بنرها",
        icon: FlagBanner,
        permission: "banners.view",
      },
      {
        href: hajiasalPath("/admin/media"),
        label: "رسانه",
        icon: Images,
        permission: "media.view",
      },
      {
        href: hajiasalPath("/admin/content"),
        label: "محتوای سریع",
        icon: Article,
        permission: "content.view",
      },
    ],
  },
  {
    id: "system",
    label: "سیستم",
    items: [
      {
        href: hajiasalPath("/admin/notifications"),
        label: "اعلان‌ها",
        icon: Bell,
        permission: "notifications.view",
      },
      {
        href: hajiasalPath("/admin/reports"),
        label: "گزارش‌ها",
        icon: ChartBar,
        permission: "reports.view",
      },
      {
        href: hajiasalPath("/admin/logs"),
        label: "لاگ سیستم",
        icon: Scroll,
        permission: "logs.view",
      },
      {
        href: hajiasalPath("/admin/users"),
        label: "کاربران پنل",
        icon: UserGear,
        permission: "admin_users.view",
      },
      {
        href: hajiasalPath("/admin/settings"),
        label: "تنظیمات",
        icon: Gear,
        permission: "settings.view",
      },
      {
        href: hajiasalPath("/"),
        label: "فروشگاه",
        icon: Storefront,
        permission: "dashboard.view",
      },
    ],
  },
];

export function filterNavForRole(role: AdminRole | string | null | undefined) {
  return ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => can(role, item.permission)),
  })).filter((group) => group.items.length > 0);
}
