"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  Package,
  MapPin,
  Heart,
  SignOut,
  House,
} from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import { hajiasalPath } from "@/lib/paths";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const links = [
  { href: hajiasalPath("/account"), label: "خلاصه", icon: House },
  { href: hajiasalPath("/account/orders"), label: "سفارش‌ها", icon: Package },
  { href: hajiasalPath("/account/addresses"), label: "آدرس‌ها", icon: MapPin },
  { href: hajiasalPath("/account/wishlist"), label: "علاقه‌مندی", icon: Heart },
  { href: hajiasalPath("/account/profile"), label: "پروفایل", icon: User },
];

export function AccountSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <>
      <nav className="hidden w-56 shrink-0 lg:block">
        <ul className="sticky top-24 flex flex-col gap-1">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-colors",
                  pathname === link.href
                    ? "bg-gold-dim font-medium text-primary"
                    : "text-secondary hover:bg-surface-muted hover:text-primary",
                )}
              >
                <Icon icon={link.icon} size={18} />
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => void logout()}
              className="flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-secondary hover:bg-surface-muted hover:text-primary"
            >
              <Icon icon={SignOut} size={18} />
              خروج
            </button>
          </li>
        </ul>
      </nav>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-1 py-1 backdrop-blur lg:hidden pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        <ul className="flex justify-around">
          {links.map((link) => (
            <li key={link.href} className="min-w-0 flex-1">
              <Link
                href={link.href}
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] touch-manipulation",
                  pathname === link.href ? "text-gold" : "text-secondary",
                )}
              >
                <Icon icon={link.icon} size={20} />
                <span className="truncate">{link.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
