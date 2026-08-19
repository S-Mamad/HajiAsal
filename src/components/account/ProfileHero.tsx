"use client";

import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { hajiasalPath } from "@/lib/paths";

interface ProfileHeroProps {
  displayName: string;
  initials: string;
  phone: string;
  addressSummary?: string | null;
  className?: string;
}

export function ProfileHero({
  displayName,
  initials,
  phone,
  addressSummary = null,
  className,
}: ProfileHeroProps) {
  const hasAddress = Boolean(addressSummary?.trim());

  return (
    <Link
      href={hajiasalPath("/account/profile")}
      className={cn(
        "group flex items-center gap-3 rounded-2xl bg-surface-elevated/90 px-4 py-3.5",
        "transition-opacity duration-150 active:opacity-85",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/45 focus-visible:ring-offset-2 focus-visible:ring-offset-void",
        className,
      )}
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-dim text-[12px] font-bold tracking-tight text-gold"
        aria-hidden
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold tracking-tight text-primary">
          {displayName}
        </p>
        {phone ? (
          <p className="mt-0.5 text-[12px] tabular-nums text-secondary" dir="ltr">
            {phone}
          </p>
        ) : (
          <p className="mt-0.5 text-[12px] text-dim">شماره موبایل</p>
        )}
        {hasAddress ? (
          <p className="mt-1.5 line-clamp-1 text-[12px] leading-5 text-dim">
            {addressSummary}
          </p>
        ) : (
          <p className="mt-1.5 text-[12px] text-dim">
            <span className="text-secondary">آدرس تحویل:</span>{" "}
            <span className="text-gold/90">ثبت نشده</span>
          </p>
        )}
      </div>
      <CaretLeft
        size={16}
        className="shrink-0 text-dim transition-colors group-hover:text-gold"
        aria-hidden
      />
    </Link>
  );
}
