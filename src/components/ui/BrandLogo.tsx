"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { BRAND_LOGO_PATH } from "@/lib/brand-assets";

const LOGO_SRC = BRAND_LOGO_PATH;
/** Intrinsic crop of the droplet mark (transparent PNG). */
const LOGO_W = 615;
const LOGO_H = 914;

const sizeMap = {
  sm: { height: 36, className: "h-9 w-auto" },
  md: { height: 44, className: "h-10 w-auto sm:h-11" },
  /** Nav bar: tall droplet needs room so calligraphy stays legible. */
  header: {
    height: 56,
    className:
      "h-12 w-auto sm:h-14 drop-shadow-[0_2px_6px_rgba(0,0,0,0.28)]",
  },
  lg: { height: 72, className: "h-[4.25rem] w-auto sm:h-[4.75rem]" },
  xl: { height: 168, className: "h-28 w-auto sm:h-36 md:h-40 lg:h-44" },
} as const;

export type BrandLogoSize = keyof typeof sizeMap;

interface BrandLogoProps {
  name: string;
  className?: string;
  markClassName?: string;
  /** Calligraphy already spells the brand; keep off unless a text lockup is needed. */
  showName?: boolean;
  size?: BrandLogoSize;
  priority?: boolean;
}

export function BrandLogo({
  name,
  className,
  markClassName,
  showName = false,
  size = "md",
  priority = false,
}: BrandLogoProps) {
  const s = sizeMap[size];

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src={LOGO_SRC}
        alt={showName ? "" : name}
        width={Math.round((s.height * LOGO_W) / LOGO_H)}
        height={s.height}
        sizes={`${s.height}px`}
        priority={priority}
        className={cn(
          "shrink-0 object-contain object-center",
          s.className,
          markClassName,
        )}
      />
      {showName ? (
        <span className="truncate font-display text-base tracking-tight text-primary sm:text-lg">
          {name}
        </span>
      ) : null}
    </span>
  );
}
