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
        "account-stat overflow-hidden rounded-2xl border border-border/80 bg-surface",
        className,
      )}
    >
      {sellerPanel?.url ? (
        <a
          href={sellerPanel.url}
          className={cn(
            "group flex min-h-[3.25rem] items-center gap-3 border-b border-border/70 bg-gold/[0.06] px-4 py-3",
            "transition-colors duration-150 active:bg-surface-muted",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/45",
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold transition-transform group-hover:scale-105">
            <Storefront size={18} weight="duotone" aria-hidden />
          </span>
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
            "group flex min-h-[3.25rem] items-center gap-3 px-4 py-3",
            "transition-colors duration-150 active:bg-surface-muted/80",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/45",
            (index > 0 || sellerPanel?.url) && "border-t border-border/70",
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-elevated text-secondary transition-[background-color,color,transform] group-hover:bg-gold-dim group-hover:text-gold group-hover:scale-105">
            <link.icon size={18} weight="regular" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 text-[15px] font-medium text-primary">
            {link.label}
          </span>
          <CaretLeft
            size={14}
            className="shrink-0 text-dim transition-colors group-hover:text-gold/70"
            aria-hidden
          />
        </Link>
      ))}
    </nav>
  );
}
