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
  const openCart = useCartStore((s) => s.openCart);
  const closeCart = useCartStore((s) => s.closeCart);
  const cartOpen = useCartStore((s) => s.isOpen);
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
    closeCart();
    setSearchOpen(true);
  };

  const toggleMobile = () => {
    setSearchOpen(false);
    closeCart();
    setMobileOpen((v) => !v);
  };

  const handleOpenCart = () => {
    setSearchOpen(false);
    setMobileOpen(false);
    openCart();
  };

  useEffect(() => {
    if (cartOpen) {
      setSearchOpen(false);
      setMobileOpen(false);
    }
  }, [cartOpen]);

  return (
    <>
      <header
        className={cn(
          "site-header fixed inset-x-0 top-0 h-14 border-b backdrop-blur-xl sm:h-16",
          mobileOpen ? "z-[100]" : "z-50",
        )}
      >
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-2 px-3 sm:px-4 md:px-8">
          <Link
            href={hajiasalPath()}
            className="min-w-0"
            onClick={() => setMobileOpen(false)}
            aria-label={siteData.brand.name}
          >
            <BrandLogo name={siteData.brand.name} />
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

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
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
              onClick={() => setMobileOpen(false)}
            >
              <Icon icon={Heart} size={18} />
              {hasHydrated ? <CountBadge count={wishlistCount} /> : null}
            </Link>
            <UserMenu compact />
            <button
              type="button"
              onClick={handleOpenCart}
              className={cn("relative", iconBtn)}
              aria-label="سبد خرید"
            >
              <Icon icon={ShoppingBag} size={18} />
              {hasHydrated ? <CountBadge count={itemCount} /> : null}
            </button>
            <button
              type="button"
              onClick={toggleMobile}
              className={cn(iconBtn, "lg:hidden")}
              aria-label={mobileOpen ? "بستن منو" : "منو"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
            >
              <Icon icon={mobileOpen ? X : List} size={20} />
            </button>
          </div>
        </div>
      </header>
      <div className="h-14 sm:h-16" aria-hidden />
      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
