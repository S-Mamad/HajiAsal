"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  House,
  Storefront,
  ShoppingBag,
  User,
} from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import { CountBadge } from "@/components/ui/CountBadge";
import { useCartStore } from "@/store/cart";
import { hajiasalPath } from "@/lib/paths";
import { shouldShowFloatingNav } from "@/lib/layout/floating-nav";
import { cn } from "@/lib/utils";

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: typeof House;
  match: (pathname: string) => boolean;
  badge?: "cart";
};

const ITEMS: NavItem[] = [
  {
    id: "home",
    label: "خانه",
    href: hajiasalPath(),
    icon: House,
    match: (pathname) => pathname === hajiasalPath() || pathname === "/",
  },
  {
    id: "products",
    label: "محصولات",
    href: hajiasalPath("/shop"),
    icon: Storefront,
    match: (pathname) => pathname.startsWith(hajiasalPath("/shop")),
  },
  {
    id: "cart",
    label: "سبد خرید",
    href: hajiasalPath("/cart"),
    icon: ShoppingBag,
    badge: "cart",
    match: (pathname) => pathname.startsWith(hajiasalPath("/cart")),
  },
  {
    id: "profile",
    label: "حساب",
    href: hajiasalPath("/account"),
    icon: User,
    match: (pathname) =>
      pathname.startsWith(hajiasalPath("/account")) ||
      pathname.startsWith(hajiasalPath("/login")) ||
      pathname.startsWith(hajiasalPath("/register")),
  },
];

function shouldHide(pathname: string): boolean {
  return !shouldShowFloatingNav(pathname);
}

export function FloatingBottomNav() {
  const pathname = usePathname() ?? "/";
  const reduceMotion = useReducedMotion();
  const itemCount = useCartStore((s) => s.getItemCount());
  const hasHydrated = useCartStore((s) => s._hasHydrated);

  if (shouldHide(pathname)) return null;

  const activeId = ITEMS.find((item) => item.match(pathname))?.id ?? "home";

  return (
    <nav
      aria-label="ناوبری اصلی موبایل"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[45] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 md:px-6 lg:hidden"
    >
      <div
        className={cn(
          "floating-glass-nav pointer-events-auto relative flex h-[4.5rem] w-[min(92%,26rem)] items-stretch justify-between gap-0.5 px-1.5 sm:h-[4.75rem] sm:w-[min(88%,28rem)] sm:gap-1 sm:px-2",
          "rounded-[1.35rem] sm:rounded-[1.5rem]",
        )}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-l from-transparent via-white/65 to-transparent opacity-80 dark:via-white/30"
        />

        {ITEMS.map((item) => {
          const active = item.id === activeId;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "relative z-[1] flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 touch-manipulation",
                "transition-[color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                "active:scale-[0.97]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/45 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                active ? "text-gold" : "text-secondary/75 hover:text-primary",
              )}
              aria-current={active ? "page" : undefined}
            >
              <span className="relative flex h-9 w-9 items-center justify-center">
                {active ? (
                  <motion.span
                    layoutId={
                      reduceMotion ? undefined : "floating-nav-active"
                    }
                    aria-hidden
                    className="absolute inset-0 rounded-[0.7rem] bg-gold/[0.14] shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] ring-1 ring-gold/20 dark:bg-gold/[0.2] dark:ring-gold/30"
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 480, damping: 36 }
                    }
                  />
                ) : null}
                <Icon
                  icon={item.icon}
                  size={20}
                  weight={active ? "fill" : "regular"}
                  className="relative z-[1]"
                />
                {item.badge === "cart" && hasHydrated ? (
                  <CountBadge
                    count={itemCount}
                    className="-top-1 -end-1 h-4 min-w-4 text-[8px] ring-2 ring-white/80 dark:ring-[rgb(20_20_20/0.85)]"
                  />
                ) : null}
              </span>
              <span
                className={cn(
                  "relative text-[10px] leading-none tracking-wide sm:text-[11px]",
                  active ? "font-semibold text-gold" : "font-medium",
                )}
              >
                {item.label}
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-1 -bottom-1.5 mx-auto h-0.5 w-3 rounded-full bg-gold/70"
                  />
                ) : null}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
