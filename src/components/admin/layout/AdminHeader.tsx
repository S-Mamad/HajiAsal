"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CaretLeft } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import { hajiasalPath } from "@/lib/paths";
import { cn } from "@/lib/utils";

const PAGE_TITLES: Record<string, string> = {
  [hajiasalPath("/admin/dashboard")]: "داشبورد",
  [hajiasalPath("/admin/orders")]: "سفارش‌ها",
  [hajiasalPath("/admin/products")]: "محصولات",
  [hajiasalPath("/admin/brands")]: "برندها",
  [hajiasalPath("/admin/sellers")]: "فروشندگان",
  [hajiasalPath("/admin/categories")]: "دسته‌بندی‌ها",
  [hajiasalPath("/admin/inventory")]: "موجودی",
  [hajiasalPath("/admin/customers")]: "مشتریان",
  [hajiasalPath("/admin/reviews")]: "نظرات",
  [hajiasalPath("/admin/coupons")]: "کوپن‌ها",
  [hajiasalPath("/admin/messages")]: "پیام‌ها",
  [hajiasalPath("/admin/newsletter")]: "خبرنامه",
  [hajiasalPath("/admin/articles")]: "مقالات",
  [hajiasalPath("/admin/media")]: "رسانه",
  [hajiasalPath("/admin/banners")]: "بنرها",
  [hajiasalPath("/admin/pages")]: "صفحات",
  [hajiasalPath("/admin/qa")]: "پرسش و پاسخ",
  [hajiasalPath("/admin/tickets")]: "تیکت‌ها",
  [hajiasalPath("/admin/notifications")]: "اعلان‌ها",
  [hajiasalPath("/admin/users")]: "کاربران پنل",
  [hajiasalPath("/admin/content")]: "محتوا",
  [hajiasalPath("/admin/reports")]: "گزارش‌ها",
  [hajiasalPath("/admin/logs")]: "لاگ سیستم",
  [hajiasalPath("/admin/settings")]: "تنظیمات",
};

function matchDetail(
  pathname: string,
  base: string,
  listLabel: string,
  detailLabel: string,
) {
  const basePath = hajiasalPath(base);
  if (pathname.includes(`${basePath}/`) && pathname !== basePath) {
    return [
      { label: "مدیریت", href: hajiasalPath("/admin/dashboard") },
      { label: listLabel, href: basePath },
      { label: detailLabel },
    ];
  }
  return null;
}

function getBreadcrumbs(pathname: string): { label: string; href?: string }[] {
  return (
    matchDetail(pathname, "/admin/sellers", "فروشندگان", "مدیریت فروشنده") ??
    matchDetail(pathname, "/admin/products", "محصولات", "جزئیات محصول") ??
    matchDetail(pathname, "/admin/orders", "سفارش‌ها", "جزئیات سفارش") ??
    matchDetail(pathname, "/admin/customers", "مشتریان", "پروفایل مشتری") ??
    matchDetail(pathname, "/admin/articles", "مقالات", "ویرایش مقاله") ??
    matchDetail(pathname, "/admin/tickets", "تیکت‌ها", "جزئیات تیکت") ?? [
      { label: "مدیریت", href: hajiasalPath("/admin/dashboard") },
      ...(PAGE_TITLES[pathname]
        ? [{ label: PAGE_TITLES[pathname] }]
        : [{ label: "پنل مدیریت" }]),
    ]
  );
}

function getPageTitle(pathname: string): string {
  const crumbs = getBreadcrumbs(pathname);
  return crumbs[crumbs.length - 1]?.label ?? PAGE_TITLES[pathname] ?? "پنل مدیریت";
}

interface AdminHeaderProps {
  title?: string;
  compact?: boolean;
}

export function AdminHeader({ title, compact = false }: AdminHeaderProps) {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);
  const pageTitle = title ?? getPageTitle(pathname);

  if (compact) {
    return (
      <h2 className="truncate text-sm font-semibold text-stone-900">
        {pageTitle}
      </h2>
    );
  }

  return (
    <header className="border-b border-stone-200/80 bg-white/80 px-4 py-4 backdrop-blur sm:px-6">
      <nav
        className={cn(
          "mb-2 flex flex-wrap items-center gap-1.5 text-xs text-stone-500",
        )}
      >
        {breadcrumbs.map((crumb, index) => (
          <span
            key={`${crumb.label}-${index}`}
            className="flex items-center gap-1.5"
          >
            {index > 0 ? (
              <Icon icon={CaretLeft} size={12} className="text-stone-400" />
            ) : null}
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-stone-700">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-stone-700">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>
      <h2 className="text-lg font-semibold text-stone-900 sm:text-xl">
        {pageTitle}
      </h2>
    </header>
  );
}
