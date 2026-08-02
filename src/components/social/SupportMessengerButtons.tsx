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
    <div className={cn("flex flex-col gap-3 sm:flex-row", className)}>
      {buttons.map(({ href, label, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-primary transition-colors hover:border-gold/40 hover:text-gold"
        >
          <Icon size={18} weight="duotone" className="text-gold" />
          {label}
        </a>
      ))}
    </div>
  );
}
