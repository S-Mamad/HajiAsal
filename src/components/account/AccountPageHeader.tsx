import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AccountPageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  eyebrow?: string;
}

export function AccountPageHeader({
  title,
  subtitle,
  action,
  className,
  eyebrow,
}: AccountPageHeaderProps) {
  return (
    <header
      className={cn(
        "mb-7 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-gold/90">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-balance text-2xl font-bold leading-tight tracking-tight text-primary sm:text-[1.85rem] md:text-[2rem]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-xl text-pretty text-sm leading-relaxed text-secondary">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? (
        <div className="w-full shrink-0 sm:w-auto sm:max-w-xs">{action}</div>
      ) : null}
    </header>
  );
}
