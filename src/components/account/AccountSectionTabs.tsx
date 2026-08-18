"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
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
      className="account-section-tabs -mx-4 mb-5 border-b border-border/80 md:-mx-6 lg:hidden"
    >
      <div
        ref={scrollerRef}
        className="flex gap-1 overflow-x-auto px-4 pb-px md:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                "relative flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-[13px] transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/40",
                active
                  ? "font-semibold text-gold"
                  : "font-medium text-secondary hover:text-primary",
              )}
            >
              <Icon
                icon={link.icon}
                size={15}
                weight={active ? "fill" : "regular"}
                className="shrink-0"
              />
              <span>{link.shortLabel}</span>
              {active ? (
                <motion.span
                  layoutId={reduceMotion ? undefined : "account-section-tab"}
                  aria-hidden
                  className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-gold"
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 480, damping: 36 }
                  }
                />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
