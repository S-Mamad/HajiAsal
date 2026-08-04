"use client";

import type { SocialLinks } from "@/types";
import { cn } from "@/lib/utils";
import {
  SocialBrandIcon,
  type SocialBrand,
} from "@/components/social/SocialBrandIcon";

interface SupportMessengerButtonsProps {
  social?: SocialLinks;
  className?: string;
}

export function SupportMessengerButtons({
  social,
  className,
}: SupportMessengerButtonsProps) {
  const buttons = [
    social?.supportEitaa || social?.eitaa
      ? {
          href: social.supportEitaa || social.eitaa!,
          label: "پیام در ایتا",
          brand: "eitaa" as SocialBrand,
        }
      : null,
    social?.supportTelegram || social?.telegram
      ? {
          href: social.supportTelegram || social.telegram!,
          label: "پیام در تلگرام",
          brand: "telegram" as SocialBrand,
        }
      : null,
    social?.instagram
      ? {
          href: social.instagram,
          label: "اینستاگرام",
          brand: "instagram" as SocialBrand,
        }
      : null,
  ].filter(Boolean) as Array<{
    href: string;
    label: string;
    brand: SocialBrand;
  }>;

  if (buttons.length === 0) return null;

  return (
    <div className={cn("grid grid-cols-1 gap-2.5 sm:grid-cols-3", className)}>
      {buttons.map(({ href, label, brand }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-primary transition-colors hover:border-gold/40 hover:bg-gold/[0.06] hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
        >
          <SocialBrandIcon
            brand={brand}
            size={22}
            alt=""
            className="shrink-0 rounded-[22%]"
          />
          <span className="truncate">{label}</span>
        </a>
      ))}
    </div>
  );
}
