"use client";

import { PaperPlaneTilt, TelegramLogo } from "@phosphor-icons/react";
import type { SocialLinks } from "@/types";
import { cn } from "@/lib/utils";

interface SupportMessengerButtonsProps {
  social?: SocialLinks;
  className?: string;
}

export function SupportMessengerButtons({
  social,
  className,
}: SupportMessengerButtonsProps) {
  const buttons = [
    social?.supportEitaa
      ? {
          href: social.supportEitaa,
          label: "پیام در ایتا",
          Icon: PaperPlaneTilt,
        }
      : null,
    social?.supportTelegram
      ? {
          href: social.supportTelegram,
          label: "پیام در تلگرام",
          Icon: TelegramLogo,
        }
      : null,
  ].filter(Boolean) as Array<{
    href: string;
    label: string;
    Icon: typeof PaperPlaneTilt;
  }>;

  if (buttons.length === 0) return null;

  return (
    <div className={cn("grid grid-cols-1 gap-2.5 sm:grid-cols-2", className)}>
      {buttons.map(({ href, label, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-primary transition-colors hover:border-gold/40 hover:bg-gold/[0.06] hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
        >
          <Icon size={18} weight="duotone" className="shrink-0 text-gold" />
          <span className="truncate">{label}</span>
        </a>
      ))}
    </div>
  );
}
