"use client";

import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { hajiasalPath } from "@/lib/paths";

interface ProfileHeroProps {
  displayName: string;
  initials: string;
  phone: string;
  className?: string;
}

export function ProfileHero({
  displayName,
  initials,
  phone,
  className,
}: ProfileHeroProps) {
  return (
    <Link
      href={hajiasalPath("/account/profile")}
      className={cn(
        "flex min-h-12 items-center gap-3.5 rounded-2xl py-1.5",
        "transition-opacity duration-150 active:opacity-80",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/45 focus-visible:ring-offset-2 focus-visible:ring-offset-void",
        className,
      )}
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold-dim text-[13px] font-bold tracking-tight text-gold"
        aria-hidden
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[17px] font-semibold tracking-tight text-primary">
          {displayName}
        </p>
        {phone ? (
          <p
            className="mt-0.5 text-[13px] tabular-nums text-secondary"
            dir="ltr"
          >
            {phone}
          </p>
        ) : (
          <p className="mt-0.5 text-[13px] text-secondary">ویرایش پروفایل</p>
        )}
      </div>
      <CaretLeft size={16} className="shrink-0 text-dim" aria-hidden />
    </Link>
  );
}
