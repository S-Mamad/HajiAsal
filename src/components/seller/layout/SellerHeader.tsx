"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CaretLeft, Keyboard, MagnifyingGlass } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import { hajiasalPath } from "@/lib/paths";
import { resolveSellerPageTitle } from "@/lib/seller/nav";
import { NotificationCenter } from "@/components/seller/global/NotificationCenter";

interface SellerHeaderProps {
  compact?: boolean;
}

export function SellerHeader({ compact = false }: SellerHeaderProps) {
  const pathname = usePathname();
  const title = resolveSellerPageTitle(pathname ?? "");

  const actions = (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() =>
          window.dispatchEvent(new Event("seller:open-search"))
        }
        className="flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm text-stone-600 hover:bg-stone-100"
        aria-label="جستجو"
      >
        <Icon icon={MagnifyingGlass} size={18} />
        {!compact ? (
          <span className="hidden sm:inline text-xs text-stone-400">Ctrl+K</span>
        ) : null}
      </button>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("seller:open-help"))}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100"
        aria-label="میانبرها"
      >
        <Icon icon={Keyboard} size={18} />
      </button>
      <NotificationCenter />
    </div>
  );

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2">
        <h2 className="truncate text-sm font-semibold text-stone-900">{title}</h2>
        {actions}
      </div>
    );
  }

  return (
    <header className="border-b border-stone-200 bg-white/90 px-4 py-4 backdrop-blur sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
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
          <h2 className="text-lg font-semibold text-stone-900 sm:text-xl">
            {title}
          </h2>
        </div>
        {actions}
      </div>
    </header>
  );
}
