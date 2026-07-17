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
  { href: hajiasalPath("/account/wishlist"), label: "علاقه‌مندی‌ها", icon: Heart },
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
                    ? "bg-gold-dim font-medium text-brown"
                    : "text-muted hover:bg-cream-dark hover:text-brown",
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
              className="flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-muted hover:bg-cream-dark hover:text-brown"
            >
              <Icon icon={SignOut} size={18} />
              خروج
            </button>
          </li>
        </ul>
      </nav>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface px-2 py-2 lg:hidden">
        <ul className="flex justify-around">
          {links.slice(0, 4).map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1 text-[10px]",
                  pathname === link.href ? "text-amber" : "text-muted",
                )}
              >
                <Icon icon={link.icon} size={20} />
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
