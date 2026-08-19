"use client";

import { useState, useEffect, useMemo } from "react";
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
import { CountBadge } from "@/components/ui/CountBadge";
import { SearchModal } from "./SearchModal";
import { ThemeToggle } from "./ThemeToggle";
import {
  DesktopNav,
  MobileDrawer,
  UserAccountMenu,
  buildResolvedNavItems,
  isNavActive,
} from "@/components/menu";
import { hajiasalPath } from "@/lib/paths";

export function Header() {
  const siteData = useSiteSettings();
  const pathname = usePathname();
  const isShopPage = pathname === hajiasalPath("/shop");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const itemCount = useCartStore((s) => s.getItemCount());
  const hasCartHydrated = useCartStore((s) => s._hasHydrated);
  const hasWishlistHydrated = useWishlistStore((s) => s._hasHydrated);
  const wishlistCount = useWishlistStore((s) => s.count());
  const badgesReady = hasCartHydrated && hasWishlistHydrated;

  const navItems = useMemo(
    () => buildResolvedNavItems(siteData.nav),
    [siteData.nav],
  );

  const iconBtn =
    "flex h-10 w-10 items-center justify-center rounded-full text-secondary transition-[color,background-color,transform] duration-200 hover:bg-gold-dim hover:text-gold active:scale-[0.96] touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--header-bg)]";

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setScrolled(window.scrollY > 6);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

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
          "site-header fixed inset-x-0 top-0 z-50 h-16 sm:h-[4.75rem]",
          scrolled && "is-scrolled",
        )}
      >
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-2 px-3 sm:px-4 md:px-8">
          <Link
            href={hajiasalPath()}
            className="group/logo -ms-0.5 flex shrink-0 items-center rounded-xl px-0.5 py-0.5 transition-opacity duration-300 hover:opacity-95 active:scale-[0.98]"
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

          <DesktopNav items={navItems} pathname={pathname} />

          {/* Mobile: search + wishlist + menu (cart lives in MobileDock) */}
          <div className="flex shrink-0 items-center gap-0.5 lg:hidden">
            {!isShopPage ? (
              <button
                type="button"
                onClick={openSearch}
                className={iconBtn}
                aria-label="جستجو"
              >
                <Icon icon={MagnifyingGlass} size={18} />
              </button>
            ) : null}
            <Link
              href={hajiasalPath("/wishlist")}
              className={cn("relative", iconBtn)}
              aria-label="علاقه‌مندی‌ها"
            >
              <Icon icon={Heart} size={18} />
              {badgesReady ? <CountBadge count={wishlistCount} /> : null}
            </Link>
            <button
              type="button"
              onClick={toggleMobile}
              className={cn(iconBtn, mobileOpen && "bg-gold-dim text-gold")}
              aria-label={mobileOpen ? "بستن منو" : "منو"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
            >
              <Icon icon={mobileOpen ? X : List} size={20} />
            </button>
          </div>

          {/* Desktop actions */}
          <div className="hidden shrink-0 items-center gap-0.5 lg:flex">
            <ThemeToggle className="h-10 w-10 rounded-full hover:bg-gold-dim" />
            {!isShopPage ? (
              <button
                type="button"
                onClick={openSearch}
                className={iconBtn}
                aria-label="جستجو"
              >
                <Icon icon={MagnifyingGlass} size={18} />
              </button>
            ) : null}
            <Link
              href={hajiasalPath("/wishlist")}
              className={cn("relative", iconBtn)}
              aria-label="علاقه‌مندی‌ها"
              aria-current={
                isNavActive(pathname, hajiasalPath("/wishlist"))
                  ? "page"
                  : undefined
              }
            >
              <Icon icon={Heart} size={18} />
              {badgesReady ? <CountBadge count={wishlistCount} /> : null}
            </Link>
            <span className="mx-1 h-4 w-px bg-border" aria-hidden />
            <UserAccountMenu
              compact
              className="h-10 w-10 rounded-full hover:bg-gold-dim"
            />
            <Link
              href={hajiasalPath("/cart")}
              className={cn(
                "relative",
                iconBtn,
                isNavActive(pathname, hajiasalPath("/cart")) &&
                  "bg-gold-dim text-gold",
              )}
              aria-label="سبد خرید"
              aria-current={
                isNavActive(pathname, hajiasalPath("/cart"))
                  ? "page"
                  : undefined
              }
            >
              <Icon icon={ShoppingBag} size={18} />
              {hasCartHydrated ? <CountBadge count={itemCount} /> : null}
            </Link>
          </div>
        </div>
      </header>
      <div className="h-16 sm:h-[4.75rem]" aria-hidden />
      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        items={navItems}
      />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
