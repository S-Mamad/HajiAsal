"use client";

import Link from "next/link";
import { ArrowRight, Storefront } from "@phosphor-icons/react";
import { ACCOUNT_STORE_LINK } from "@/lib/account/nav";
import { cn } from "@/lib/utils";

type AccountBackBarProps = {
  className?: string;
};

export function AccountBackBar({ className }: AccountBackBarProps) {
  return (
    <Link
      href={ACCOUNT_STORE_LINK.href}
      className={cn(
        "group mb-5 inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface/80 px-3.5 py-2 text-xs font-medium text-secondary backdrop-blur-sm transition-[border-color,color,background-color] duration-200",
        "hover:border-gold/30 hover:bg-surface hover:text-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/45 focus-visible:ring-offset-2 focus-visible:ring-offset-void",
        className,
      )}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-dim text-gold transition-transform duration-200 group-hover:scale-105">
        <Storefront size={13} weight="duotone" />
      </span>
      <span>{ACCOUNT_STORE_LINK.label}</span>
      <ArrowRight
        size={13}
        className="opacity-50 transition-transform duration-200 group-hover:-translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}
