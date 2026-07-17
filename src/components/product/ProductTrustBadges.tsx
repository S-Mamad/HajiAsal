import { Leaf, ShieldCheck, SealCheck } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";

const badges = [
  { icon: Leaf, label: "۱۰۰٪ طبیعی" },
  { icon: ShieldCheck, label: "بدون افزودنی" },
  { icon: SealCheck, label: "دارای تأییدیه" },
];

export function ProductTrustBadges() {
  return (
    <div className="flex flex-wrap gap-4">
      {badges.map((badge) => (
        <div
          key={badge.label}
          className="flex flex-col items-center gap-2 text-center"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--pdp-border)] bg-[var(--pdp-surface)] text-[var(--pdp-accent)]">
            <Icon icon={badge.icon} size={22} aria-hidden />
          </div>
          <span className="text-xs text-[var(--pdp-muted)]">{badge.label}</span>
        </div>
      ))}
    </div>
  );
}
