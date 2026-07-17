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
    card: "border-slate-200 bg-white",
    icon: "bg-slate-100 text-slate-600",
    value: "text-slate-900",
  },
  amber: {
    card: "border-amber-200/70 bg-gradient-to-br from-white to-amber-50/40",
    icon: "bg-amber-100 text-amber-800",
    value: "text-stone-900",
  },
  emerald: {
    card: "border-emerald-200/70 bg-gradient-to-br from-white to-emerald-50/30",
    icon: "bg-emerald-100 text-emerald-700",
    value: "text-slate-900",
  },
  rose: {
    card: "border-rose-200/70 bg-gradient-to-br from-white to-rose-50/30",
    icon: "bg-rose-100 text-rose-700",
    value: "text-slate-900",
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
        "rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5",
        t.card,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 sm:text-sm">{label}</p>
          <p
            className={cn(
              "mt-1 truncate text-xl font-semibold tabular-nums sm:text-2xl",
              t.value,
            )}
          >
            {typeof value === "number" ? value.toLocaleString("fa-IR") : value}
          </p>
          {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
        </div>
        {icon ? (
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              t.icon,
            )}
          >
            <Icon icon={icon} size={20} />
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
    <div className="space-y-6 animate-pulse" aria-busy aria-label="در حال بارگذاری">
      <div
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        style={{ gridTemplateColumns: undefined }}
      >
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-2xl border border-slate-200 bg-slate-100/80"
          />
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-12 border-t border-slate-100 first:border-0 bg-slate-50/50"
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
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <p className="text-base font-medium text-slate-800">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
