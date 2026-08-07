"use client";

import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react";
import { hajiasalPath } from "@/lib/paths";
import type { ProductBreadcrumbProps } from "../types";

export function ProductBreadcrumb({
  category,
  categoryLabel,
  title,
}: ProductBreadcrumbProps) {
  return (
    <nav
      aria-label="مسیر صفحه"
      className="mb-7 flex flex-wrap items-center gap-1.5 text-[13px] text-dim md:mb-9"
    >
      <Link
        href={hajiasalPath("/shop")}
        className="transition-colors hover:text-gold"
      >
        فروشگاه
      </Link>
      <CaretLeft size={12} className="opacity-45" aria-hidden />
      <Link
        href={hajiasalPath(`/shop?category=${category}`)}
        className="transition-colors hover:text-gold"
      >
        {categoryLabel}
      </Link>
      <CaretLeft size={12} className="opacity-45" aria-hidden />
      <span className="max-w-[16rem] truncate text-secondary md:max-w-md">
        {title}
      </span>
    </nav>
  );
}
