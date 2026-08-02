"use client";

import {
  InstagramLogo,
  TelegramLogo,
  ChatCircle,
  ChatTeardropText,
  ChatsCircle,
  PaperPlaneTilt,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import type { SocialLinks } from "@/types";
import { cn } from "@/lib/utils";

type SocialKey = keyof Pick<
  SocialLinks,
  "eitaa" | "telegram" | "instagram" | "rubika" | "bale" | "soroush"
>;

const NETWORKS: Array<{
  key: SocialKey;
  label: string;
  Icon: Icon;
}> = [
  { key: "eitaa", label: "ایتا", Icon: PaperPlaneTilt },
  { key: "telegram", label: "تلگرام", Icon: TelegramLogo },
  { key: "instagram", label: "اینستاگرام", Icon: InstagramLogo },
  { key: "rubika", label: "روبیکا", Icon: ChatsCircle },
  { key: "bale", label: "بله", Icon: ChatCircle },
  { key: "soroush", label: "سروش", Icon: ChatTeardropText },
];

interface SocialFollowSectionProps {
  social?: SocialLinks;
  className?: string;
  compact?: boolean;
}

export function SocialFollowSection({
  social,
  className,
  compact = false,
}: SocialFollowSectionProps) {
  if (!social) return null;

  const items = NETWORKS.filter((n) => Boolean(social[n.key]));
  if (items.length === 0) return null;

  return (
    <section className={cn(className)} aria-label="شبکه‌های اجتماعی">
      <h3
        className={cn(
          "font-semibold text-primary",
          compact ? "mb-3 text-sm" : "mb-4 text-base",
        )}
      >
        ما را در شبکه‌های اجتماعی دنبال کنید
      </h3>
      <ul
        className={cn(
          "flex flex-wrap gap-2",
          compact ? "justify-center" : "justify-start",
        )}
      >
        {items.map(({ key, label, Icon }) => (
          <li key={key}>
            <a
              href={social[key]}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-secondary transition-colors hover:border-gold/40 hover:text-gold",
                compact && "text-[13px]",
              )}
            >
              <Icon size={compact ? 16 : 18} weight="duotone" className="text-gold/90" />
              <span>{label}</span>
              <span className="text-dim" dir="ltr">
                @hajiasal_ir
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
