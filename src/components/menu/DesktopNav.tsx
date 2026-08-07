"use client";

import { cn } from "@/lib/utils";
import { isNavActive } from "./nav-config";
import { NavLink } from "./NavLink";
import type { DesktopNavProps } from "./types";

export function DesktopNav({
  items,
  pathname,
  className,
  "aria-label": ariaLabel = "منوی اصلی",
}: DesktopNavProps) {
  return (
    <nav
      className={cn("hidden items-center gap-0.5 lg:flex", className)}
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const active = isNavActive(pathname, item.href);
        return (
          <NavLink
            key={item.id}
            href={item.href}
            label={item.label}
            active={active}
            className="relative rounded-full px-3.5 py-2 text-[13px] tracking-wide transition-colors duration-200"
            activeClassName="bg-gold-dim font-medium text-gold"
            inactiveClassName="text-secondary hover:bg-surface-muted/80 hover:text-primary"
          />
        );
      })}
    </nav>
  );
}
