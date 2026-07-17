"use client";

import { cn } from "@/lib/utils";

interface BrandLogoProps {
  name: string;
  className?: string;
  markClassName?: string;
  showName?: boolean;
}

export function BrandLogo({
  name,
  className,
  markClassName,
  showName = true,
}: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hajiasal/brand/mark.svg"
        alt=""
        width={36}
        height={36}
        className={cn("h-8 w-8 shrink-0 sm:h-9 sm:w-9", markClassName)}
        decoding="async"
      />
      {showName ? (
        <span className="truncate font-display text-base tracking-tight text-primary sm:text-lg">
          {name}
        </span>
      ) : null}
    </span>
  );
}
