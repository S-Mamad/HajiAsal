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
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() =>
          window.dispatchEvent(new Event("seller:open-search"))
        }
        className="flex h-10 items-center gap-1.5 rounded-[var(--panel-radius-sm)] px-2.5 text-sm text-zinc-600 transition hover:bg-zinc-100 active:scale-[0.98]"
        aria-label="جستجو"
      >
        <Icon icon={MagnifyingGlass} size={18} />
        {!compact ? (
          <span className="hidden text-[11px] text-zinc-400 sm:inline">
            Ctrl+K
          </span>
        ) : null}
      </button>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("seller:open-help"))}
        className="flex h-10 w-10 items-center justify-center rounded-[var(--panel-radius-sm)] text-zinc-600 transition hover:bg-zinc-100 active:scale-[0.98]"
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
        <h2 className="truncate text-sm font-semibold text-zinc-900">{title}</h2>
        {actions}
      </div>
    );
  }

  return (
    <header className="border-b border-[var(--panel-border)] bg-[var(--panel-surface)]/90 px-4 py-3.5 backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1440px] items-start justify-between gap-3">
        <div className="min-w-0">
          <nav
            className="mb-1 flex items-center gap-1.5 text-[11px] text-zinc-500"
            aria-label="مسیر صفحه"
          >
            <Link
              href={hajiasalPath("/seller/dashboard")}
              className="transition hover:text-zinc-800"
            >
              فروشنده
            </Link>
            <Icon icon={CaretLeft} size={11} className="text-zinc-400" />
            <span className="text-zinc-700">{title}</span>
          </nav>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
            {title}
          </h2>
        </div>
        {actions}
      </div>
    </header>
  );
}
