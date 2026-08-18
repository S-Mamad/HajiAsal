"use client";

import type { SocialLinks } from "@/types";
import { cn } from "@/lib/utils";
import {
  SocialBrandIcon,
  type SocialBrand,
} from "@/components/social/SocialBrandIcon";

type SocialKey = keyof Pick<
  SocialLinks,
  "eitaa" | "telegram" | "instagram" | "rubika" | "bale" | "soroush"
>;

const HANDLE = "@hajiasal_ir";

const NETWORKS: Array<{
  key: SocialKey;
  brand: SocialBrand;
  label: string;
}> = [
  { key: "eitaa", brand: "eitaa", label: "ایتا" },
  { key: "telegram", brand: "telegram", label: "تلگرام" },
  { key: "instagram", brand: "instagram", label: "اینستاگرام" },
  { key: "rubika", brand: "rubika", label: "روبیکا" },
  { key: "bale", brand: "bale", label: "بله" },
  { key: "soroush", brand: "soroush", label: "سروش" },
];

interface SocialFollowSectionProps {
  social?: SocialLinks;
  className?: string;
  /** Icon row for tight spaces (footer). */
  compact?: boolean;
}

/** White circular pad for brands; eitaa already has its own pad baked in. */
function SocialIconFace({
  brand,
  size,
}: {
  brand: SocialBrand;
  size: number;
}) {
  // Eitaa SVG already includes the white circle + mark — no extra inset.
  const pad = brand === "eitaa" ? 0 : Math.max(4, Math.round(size * 0.12));
  const inner = size - pad * 2;

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.08]"
      style={{ width: size, height: size, padding: pad }}
    >
      <SocialBrandIcon
        brand={brand}
        size={inner}
        alt=""
        className={
          brand === "eitaa" ? "rounded-full object-cover" : "rounded-[22%] object-cover"
        }
      />
    </span>
  );
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
        <ul className="flex flex-wrap items-center justify-center gap-2 md:flex-nowrap md:justify-start md:gap-1.5 xl:gap-2">
          {items.map(({ key, brand, label }) => (
            <li key={key} className="shrink-0">
              <a
                href={social[key]}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
                className="block transition duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:ring-offset-2 focus-visible:ring-offset-void"
              >
                <span className="md:hidden">
                  <SocialIconFace brand={brand} size={32} />
                </span>
                <span className="hidden md:inline-flex xl:hidden">
                  <SocialIconFace brand={brand} size={30} />
                </span>
                <span className="hidden xl:inline-flex">
                  <SocialIconFace brand={brand} size={36} />
                </span>
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

      <ul className="flex flex-wrap items-center justify-center gap-3 sm:justify-start sm:gap-3.5">
        {items.map(({ key, brand, label }) => (
          <li key={key}>
            <a
              href={social[key]}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-2 transition duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:ring-offset-2"
            >
              <SocialIconFace brand={brand} size={48} />
              <span className="text-[12px] text-secondary transition-colors group-hover:text-primary">
                {label}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
