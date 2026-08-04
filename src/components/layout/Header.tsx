"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingBag,
  List,
  MagnifyingGlass,
  Heart,
  X,
} from "@phosphor-icons/react";
import { useCartStore } from "@/store/cart";
import { useWishlistStore } from "@/store/wishlist";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { UserMenu } from "@/components/auth/UserMenu";
import { CountBadge } from "@/components/ui/CountBadge";
import { MobileMenu } from "./MobileMenu";
import { SearchModal } from "./SearchModal";
import { ThemeToggle } from "./ThemeToggle";
import { extraNav, resolveNavHref } from "@/lib/nav";
import { hajiasalPath } from "@/lib/paths";

export function Header() {
  const siteData = useSiteSettings();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const itemCount = useCartStore((s) => s.getItemCount());
  const hasHydrated = useCartStore((s) => s._hasHydrated);
  const wishlistCount = useWishlistStore((s) => s.count());

  const iconBtn =
    "flex h-11 w-11 items-center justify-center rounded-xl text-secondary transition-colors hover:bg-surface-muted hover:text-gold active:bg-surface-elevated touch-manipulation";

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  const openSearch = () => {
    setMobileOpen(false);
    setSearchOpen(true);
  };

  const toggleMobile = () => {
    setSearchOpen(false);
    setMobileOpen((v) => !v);
  };

  return (
    <>
      <header
        className={cn(
          "site-header fixed inset-x-0 top-0 h-16 border-b backdrop-blur-xl sm:h-[4.75rem]",
          mobileOpen ? "z-[100]" : "z-50",
        )}
      >
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-2 px-3 sm:px-4 md:px-8">
          <Link
            href={hajiasalPath()}
            className="group/logo -ms-0.5 flex shrink-0 items-center rounded-xl px-1 py-0.5 transition-transform duration-300 hover:opacity-95 active:scale-[0.98]"
            onClick={() => setMobileOpen(false)}
            aria-label={siteData.brand.name}
          >
            <BrandLogo
              name={siteData.brand.name}
              size="header"
              priority
              markClassName="transition-transform duration-300 group-hover/logo:scale-[1.04]"
            />
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {[...siteData.nav, ...extraNav].map((item) => {
              const href = resolveNavHref(item.href);
              return (
                <Link
                  key={item.id}
                  href={href}
                  className={cn(
                    "text-sm transition-colors duration-300",
                    pathname === href
                      ? "font-medium text-gold underline decoration-gold/40 underline-offset-4"
                      : "text-secondary hover:text-gold",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile: search + wishlist + menu (cart lives in FloatingBottomNav) */}
          <div className="flex shrink-0 items-center gap-0.5 lg:hidden">
            <button
              type="button"
              onClick={openSearch}
              className={iconBtn}
              aria-label="جستجو"
            >
              <Icon icon={MagnifyingGlass} size={18} />
            </button>
            <Link
              href={hajiasalPath("/wishlist")}
              className={cn("relative", iconBtn)}
              aria-label="علاقه‌مندی‌ها"
            >
              <Icon icon={Heart} size={18} />
              {hasHydrated ? <CountBadge count={wishlistCount} /> : null}
            </Link>
            <button
              type="button"
              onClick={toggleMobile}
              className={iconBtn}
              aria-label={mobileOpen ? "بستن منو" : "منو"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
            >
              <Icon icon={mobileOpen ? X : List} size={20} />
            </button>
          </div>

          {/* Desktop actions */}
          <div className="hidden shrink-0 items-center gap-1 lg:flex">
            <ThemeToggle />
            <button
              type="button"
              onClick={openSearch}
              className={iconBtn}
              aria-label="جستجو"
            >
              <Icon icon={MagnifyingGlass} size={18} />
            </button>
            <Link
              href={hajiasalPath("/wishlist")}
              className={cn("relative", iconBtn)}
              aria-label="علاقه‌مندی‌ها"
            >
              <Icon icon={Heart} size={18} />
              {hasHydrated ? <CountBadge count={wishlistCount} /> : null}
            </Link>
            <UserMenu compact />
            <Link
              href={hajiasalPath("/cart")}
              className={cn("relative", iconBtn)}
              aria-label="سبد خرید"
              aria-current={
                pathname?.startsWith(hajiasalPath("/cart")) ? "page" : undefined
              }
            >
              <Icon icon={ShoppingBag} size={18} />
              {hasHydrated ? <CountBadge count={itemCount} /> : null}
            </Link>
          </div>
        </div>
      </header>
      <div className="h-16 sm:h-[4.75rem]" aria-hidden />
      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
