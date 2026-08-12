"use client";

import { useState } from "react";
import { Star } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

const LABELS = ["ضعیف", "متوسط", "خوب", "خیلی خوب", "عالی"] as const;

type Props = {
  onSubmit: (score: number) => void | Promise<void>;
  className?: string;
};

export function TicketCsatPrompt({ onSubmit, className }: Props) {
  const [hover, setHover] = useState(0);
  const [saving, setSaving] = useState(false);

  const pick = async (score: number) => {
    if (saving) return;
    setSaving(true);
    try {
      await onSubmit(score);
    } finally {
      setSaving(false);
    }
  };

  const active = hover;

  return (
    <div
      className={cn(
        "rounded-[1.35rem] border border-border/80 bg-gradient-to-b from-surface to-gold-dim/40 px-4 py-4 text-center",
        className,
      )}
    >
      <p className="mb-0.5 text-sm font-semibold text-primary">
        کیفیت پشتیبانی را امتیاز دهید
      </p>
      <p className="mb-3 text-xs text-secondary">
        {active ? LABELS[active - 1] : "روی ستاره بزنید"}
      </p>
      <div className="flex justify-center gap-1" dir="ltr">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={saving}
            aria-label={`${n} از ۵ · ${LABELS[n - 1]}`}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(0)}
            onClick={() => void pick(n)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl transition hover:bg-gold-dim active:scale-[0.94] disabled:opacity-50"
          >
            <Icon
              icon={Star}
              size={26}
              weight={active >= n ? "fill" : "regular"}
              className={active >= n ? "text-gold" : "text-secondary/45"}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
