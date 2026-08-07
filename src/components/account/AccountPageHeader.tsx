import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AccountPageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function AccountPageHeader({
  title,
  subtitle,
  action,
  className,
}: AccountPageHeaderProps) {
  return (
    <header
      className={cn(
        "mb-6 flex flex-col gap-4 border-b border-border/80 pb-5 sm:mb-8 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:pb-6",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-balance text-xl font-bold tracking-tight text-primary sm:text-2xl md:text-[1.75rem] md:leading-tight">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1.5 max-w-xl text-pretty text-sm leading-relaxed text-secondary">
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
