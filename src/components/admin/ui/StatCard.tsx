import type { ReactNode, ComponentType } from "react";
import type { IconProps as PhosphorIconProps } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ComponentType<PhosphorIconProps>;
  className?: string;
  tone?: "slate" | "amber" | "emerald" | "rose";
}

const TONE = {
  slate: {
    icon: "bg-zinc-100 text-zinc-600",
    accent: "border-s-zinc-300",
  },
  amber: {
    icon: "bg-amber-50 text-amber-800",
    accent: "border-s-[var(--panel-accent)]",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-700",
    accent: "border-s-emerald-500",
  },
  rose: {
    icon: "bg-rose-50 text-rose-700",
    accent: "border-s-rose-500",
  },
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon,
  className,
  tone = "slate",
}: StatCardProps) {
  const t = TONE[tone];
  return (
    <article
      className={cn(
        "panel-card border-s-[3px] p-4 transition-shadow duration-200 hover:shadow-md",
        t.accent,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-[var(--panel-muted)] sm:text-[13px]">
            {label}
          </p>
          <p className="mt-1.5 truncate text-xl font-semibold tracking-tight tabular-nums text-zinc-900 sm:text-2xl">
            {typeof value === "number" ? value.toLocaleString("fa-IR") : value}
          </p>
          {hint ? (
            <p className="mt-1 text-[11px] text-[var(--panel-faint)]">{hint}</p>
          ) : null}
        </div>
        {icon ? (
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-[var(--panel-radius-sm)]",
              t.icon,
            )}
          >
            <Icon icon={icon} size={18} />
          </span>
        ) : null}
      </div>
    </article>
  );
}

export function PanelSkeleton({
  cards = 4,
  rows = 5,
}: {
  cards?: number;
  rows?: number;
}) {
  return (
    <div
      className="space-y-6 animate-pulse"
      aria-busy
      aria-label="در حال بارگذاری"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-zinc-100/80"
          />
        ))}
      </div>
      <div className="overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-12 border-t border-zinc-100 bg-zinc-50/50 first:border-0"
          />
        ))}
      </div>
    </div>
  );
}

export function PanelEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[var(--panel-radius)] border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
      <p className="text-base font-medium text-zinc-800">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
