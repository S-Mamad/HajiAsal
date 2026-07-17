"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CaretLeft } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import { hajiasalPath } from "@/lib/paths";

const TITLES: Record<string, string> = {
  [hajiasalPath("/seller/dashboard")]: "داشبورد",
  [hajiasalPath("/seller/orders")]: "سفارش‌های من",
  [hajiasalPath("/seller/products")]: "محصولات من",
  [hajiasalPath("/seller/inventory")]: "موجودی",
  [hajiasalPath("/seller/earnings")]: "گزارش درآمد",
  [hajiasalPath("/seller/settings")]: "تنظیمات فروشگاه",
};

interface SellerHeaderProps {
  compact?: boolean;
}

export function SellerHeader({ compact = false }: SellerHeaderProps) {
  const pathname = usePathname();
  const title = TITLES[pathname ?? ""] ?? "پنل فروشنده";

  if (compact) {
    return (
      <h2 className="truncate text-sm font-semibold text-stone-900">{title}</h2>
    );
  }

  return (
    <header className="border-b border-stone-200 bg-white/90 px-4 py-4 backdrop-blur sm:px-6">
      <nav className="mb-1 flex items-center gap-1.5 text-xs text-stone-500">
        <Link
          href={hajiasalPath("/seller/dashboard")}
          className="hover:text-stone-800"
        >
          فروشنده
        </Link>
        <Icon icon={CaretLeft} size={12} className="text-stone-400" />
        <span className="text-stone-700">{title}</span>
      </nav>
      <h2 className="text-lg font-semibold text-stone-900 sm:text-xl">{title}</h2>
    </header>
  );
}
