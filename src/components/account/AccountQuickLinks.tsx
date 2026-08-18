"use client";

import Link from "next/link";
import {
  MapPin,
  Heart,
  ChatCircle,
  User,
  CaretLeft,
  Storefront,
  type Icon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { hajiasalPath } from "@/lib/paths";
import { useAuth } from "@/hooks/useAuth";

const LINKS: { href: string; label: string; icon: Icon }[] = [
  {
    href: hajiasalPath("/account/addresses"),
    label: "آدرس‌ها",
    icon: MapPin,
  },
  {
    href: hajiasalPath("/account/wishlist"),
    label: "علاقه‌مندی",
    icon: Heart,
  },
  {
    href: hajiasalPath("/account/tickets"),
    label: "پشتیبانی",
    icon: ChatCircle,
  },
  {
    href: hajiasalPath("/account/profile"),
    label: "پروفایل",
    icon: User,
  },
];

interface AccountQuickLinksProps {
  className?: string;
}

export function AccountQuickLinks({ className }: AccountQuickLinksProps) {
  const { user } = useAuth();
  const sellerPanel = user?.sellerPanel;

  return (
    <nav
      aria-label="حساب کاربری"
      className={cn(
        "overflow-hidden rounded-[1.35rem] border border-border bg-surface",
        className,
      )}
    >
      {sellerPanel?.url ? (
        <a
          href={sellerPanel.url}
          className={cn(
            "flex min-h-12 items-center gap-3 border-b border-border bg-gold/[0.06] px-4 py-3.5",
            "transition-colors duration-150 active:bg-surface-muted",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/45",
          )}
        >
          <Storefront
            size={20}
            weight="duotone"
            className="shrink-0 text-gold"
            aria-hidden
          />
          <span className="min-w-0 flex-1 text-[15px] font-medium text-primary">
            پنل فروشگاه
          </span>
          <CaretLeft size={14} className="shrink-0 text-dim" aria-hidden />
        </a>
      ) : null}
      {LINKS.map((link, index) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "flex min-h-12 items-center gap-3 px-4 py-3.5",
            "transition-colors duration-150 active:bg-surface-muted",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/45",
            (index > 0 || sellerPanel?.url) && "border-t border-border",
          )}
        >
          <link.icon
            size={20}
            weight="regular"
            className="shrink-0 text-secondary"
            aria-hidden
          />
          <span className="min-w-0 flex-1 text-[15px] font-medium text-primary">
            {link.label}
          </span>
          <CaretLeft size={14} className="shrink-0 text-dim" aria-hidden />
        </Link>
      ))}
    </nav>
  );
}
