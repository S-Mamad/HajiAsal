"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "motion/react";
import { Icon } from "@/components/ui/Icon";
import {
  ACCOUNT_NAV_LINKS,
  isAccountNavActive,
} from "@/lib/account/nav";
import { cn } from "@/lib/utils";

/**
 * Mobile section switcher for account — stays under the shared store dock
 * so حساب feels like a store tab, not a separate app.
 */
export function AccountSectionTabs() {
  const pathname = usePathname() ?? "";
  const reduceMotion = useReducedMotion();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const active = activeRef.current;
    const scroller = scrollerRef.current;
    if (!active || !scroller || typeof scroller.scrollTo !== "function") return;
    const left =
      active.offsetLeft - (scroller.clientWidth - active.clientWidth) / 2;
    scroller.scrollTo({
      left: Math.max(0, left),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [pathname, reduceMotion]);

  return (
    <nav
      aria-label="بخش‌های حساب کاربری"
      className="account-section-tabs -mx-4 mb-6 md:-mx-6 lg:hidden"
    >
      <div
        ref={scrollerRef}
        className="flex gap-1.5 overflow-x-auto px-4 pb-2 md:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {ACCOUNT_NAV_LINKS.map((link) => {
          const active = isAccountNavActive(pathname, link.href, link.exact);
          return (
            <Link
              key={link.href}
              ref={active ? activeRef : undefined}
              href={link.href}
              aria-current={active ? "page" : undefined}
              scroll={false}
              className={cn(
                "relative flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-[13px] transition-[color,background-color] duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/40",
                active
                  ? "bg-gold-dim font-semibold text-gold shadow-[inset_0_0_0_1px_rgba(161,98,7,0.12)]"
                  : "font-medium text-secondary hover:bg-surface-muted/70 hover:text-primary",
              )}
            >
              <Icon
                icon={link.icon}
                size={15}
                weight={active ? "fill" : "regular"}
                className="shrink-0"
              />
              <span>{link.shortLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
