"use client";

import { Leaf, ShieldCheck, Medal } from "@phosphor-icons/react";
import { LAB_CERTIFICATE } from "@/lib/lab-certificate";
import type { ProductFeatureBadge } from "../types";

export const PRODUCT_FEATURE_BADGES: ProductFeatureBadge[] = [
  { icon: Leaf, label: "۱۰۰٪ طبیعی" },
  { icon: ShieldCheck, label: "بدون افزودنی" },
  {
    icon: Medal,
    label: "دارای گواهی",
    href: LAB_CERTIFICATE.href,
    downloadName: LAB_CERTIFICATE.downloadName,
  },
];

export function ProductFeatureBadges({
  badges = PRODUCT_FEATURE_BADGES,
}: {
  badges?: ProductFeatureBadge[];
}) {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-3 border-y border-border py-4 sm:gap-x-0">
      {badges.map(({ icon: BadgeIcon, label, href, downloadName }, index) => {
        const body = (
          <span className="inline-flex items-center gap-2 text-sm text-secondary transition-colors group-hover:text-primary">
            <BadgeIcon size={18} weight="duotone" className="text-gold" />
            <span>{label}</span>
          </span>
        );

        return (
          <li key={label} className="flex items-center">
            {index > 0 ? (
              <span
                className="mx-4 hidden h-4 w-px bg-border sm:block"
                aria-hidden
              />
            ) : null}
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                download={downloadName}
                title={LAB_CERTIFICATE.label}
                className="group underline-offset-4 hover:underline"
              >
                {body}
              </a>
            ) : (
              <span className="group">{body}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
