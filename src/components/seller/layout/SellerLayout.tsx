"use client";

import { useEffect, useState, type ReactNode } from "react";
import { List, X } from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { SellerSidebar } from "./SellerSidebar";
import { SellerHeader } from "./SellerHeader";
import { SellerShortcutsProvider } from "@/components/seller/global/SellerShortcutsProvider";
import type { SellerCapabilitiesMap } from "@/lib/seller/capabilities";

interface SellerLayoutProps {
  children: ReactNode;
  shopName?: string;
  capabilities?: SellerCapabilitiesMap | null;
}

export function SellerLayout({
  children,
  shopName,
  capabilities,
}: SellerLayoutProps) {
  const [mobileNav, setMobileNav] = useState(false);
  const pathname = usePathname();

  useBodyScrollLock(mobileNav);

  useEffect(() => {
    setMobileNav(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNav) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNav(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNav]);

  return (
    <SellerShortcutsProvider>
      <div
        className="panel-shell seller-shell flex min-h-[100dvh] text-[var(--panel-text)]"
        dir="rtl"
      >
        <div className="hidden lg:flex">
          <SellerSidebar shopName={shopName} capabilities={capabilities} />
        </div>

        {mobileNav ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-[2px]"
              aria-label="بستن"
              onClick={() => setMobileNav(false)}
            />
            <div className="absolute inset-y-0 start-0 flex max-w-[min(20rem,88vw)] shadow-2xl">
              <div className="relative flex h-full">
                <SellerSidebar
                  shopName={shopName}
                  capabilities={capabilities}
                  onNavigate={() => setMobileNav(false)}
                />
                <button
                  type="button"
                  onClick={() => setMobileNav(false)}
                  className="absolute end-2 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-[var(--panel-radius-sm)] bg-white/10 text-zinc-100 transition hover:bg-white/15"
                  aria-label="بستن"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="sticky top-0 z-40 flex items-center gap-2 border-b border-[var(--panel-border)] bg-[var(--panel-surface)]/95 px-3 py-2 backdrop-blur lg:hidden">
            <button
              type="button"
              onClick={() => setMobileNav(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--panel-radius-sm)] text-zinc-600 transition hover:bg-zinc-100 active:scale-[0.98]"
              aria-label="منو"
              aria-expanded={mobileNav}
            >
              <List size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <SellerHeader compact />
            </div>
          </div>
          <div className="hidden lg:block">
            <SellerHeader />
          </div>
          <main className="mx-auto w-full max-w-[1440px] min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </SellerShortcutsProvider>
  );
}
