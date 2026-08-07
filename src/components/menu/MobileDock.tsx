"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Icon } from "@/components/ui/Icon";
import { CountBadge } from "@/components/ui/CountBadge";
import { useCartStore } from "@/store/cart";
import { shouldShowFloatingNav } from "@/lib/layout/floating-nav";
import { cn } from "@/lib/utils";
import { defaultDockItems } from "./nav-config";
import type { MobileDockProps } from "./types";

export function MobileDock({ items = defaultDockItems }: MobileDockProps) {
  const pathname = usePathname() ?? "/";
  const reduceMotion = useReducedMotion();
  const itemCount = useCartStore((s) => s.getItemCount());
  const hasHydrated = useCartStore((s) => s._hasHydrated);

  if (!shouldShowFloatingNav(pathname)) return null;

  const activeId = items.find((item) => item.match(pathname))?.id ?? "home";

  return (
    <nav aria-label="ناوبری اصلی موبایل" className="mobile-dock">
      <div className="mx-auto flex h-16 max-w-lg items-stretch px-1.5">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 touch-manipulation",
                "transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
                "active:scale-[0.97]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/40",
                active ? "text-gold" : "text-secondary/80 hover:text-primary",
              )}
              aria-current={active ? "page" : undefined}
            >
              <span className="relative flex h-9 w-9 items-center justify-center">
                {active ? (
                  <motion.span
                    layoutId={reduceMotion ? undefined : "mobile-dock-active"}
                    aria-hidden
                    className="absolute inset-0 rounded-xl bg-gold/[0.12] ring-1 ring-gold/20 dark:bg-gold/[0.18] dark:ring-gold/25"
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 480, damping: 36 }
                    }
                  />
                ) : null}
                <Icon
                  icon={item.icon}
                  size={22}
                  weight={active ? "fill" : "regular"}
                  className="relative z-[1]"
                />
                {item.badge === "cart" && hasHydrated ? (
                  <CountBadge
                    count={itemCount}
                    className="-top-0.5 -end-0.5 z-[2] h-4 min-w-4 text-[8px] ring-2 ring-surface dark:ring-surface-elevated"
                  />
                ) : null}
              </span>
              <span
                className={cn(
                  "relative text-[10px] leading-none tracking-wide",
                  active ? "font-semibold text-gold" : "font-medium",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
