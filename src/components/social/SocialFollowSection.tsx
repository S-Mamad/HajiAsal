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

const HANDLE = "@hajiasal_ir";

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
  /** Icon row for tight spaces (footer). */
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

  if (compact) {
    return (
      <nav
        className={cn("w-full", className)}
        aria-label="شبکه‌های اجتماعی"
      >
        <p className="mb-3 text-center text-[12px] text-dim md:text-start">
          شبکه‌های اجتماعی
          <span className="mx-1.5 text-border">·</span>
          <span dir="ltr" className="text-secondary">
            {HANDLE}
          </span>
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-2.5 md:justify-start">
          {items.map(({ key, label, Icon }) => (
            <li key={key}>
              <a
                href={social[key]}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${label} ${HANDLE}`}
                title={label}
                className="group flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-elevated/60 text-secondary transition-colors hover:border-gold/50 hover:bg-gold/10 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
              >
                <Icon size={18} weight="duotone" />
              </a>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <section className={cn("w-full", className)} aria-label="شبکه‌های اجتماعی">
      <div className="mb-6 text-center sm:text-start">
        <h3 className="text-base font-semibold text-primary md:text-lg">
          ما را در شبکه‌های اجتماعی دنبال کنید
        </h3>
        <p className="mt-1.5 text-sm text-secondary">
          همه کانال‌ها با شناسه{" "}
          <span dir="ltr" className="font-medium text-gold">
            {HANDLE}
          </span>
        </p>
      </div>

      <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-3 md:grid-cols-6 md:gap-3">
        {items.map(({ key, label, Icon }) => (
          <li key={key} className="min-w-0">
            <a
              href={social[key]}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full flex-col items-center gap-2 rounded-2xl border border-border/80 bg-surface/40 px-2 py-4 text-center transition-colors hover:border-gold/40 hover:bg-gold/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 sm:px-3 sm:py-5"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/10 text-gold transition-colors group-hover:bg-gold/15">
                <Icon size={22} weight="duotone" />
              </span>
              <span className="text-[12px] font-medium leading-tight text-primary sm:text-[13px]">
                {label}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
