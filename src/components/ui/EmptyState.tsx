import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border-bright bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      <p className="text-base font-medium text-primary">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-secondary">
          {description}
        </p>
      ) : null}
      {action ? (
        <div className="mt-5 flex flex-wrap justify-center gap-3">{action}</div>
      ) : null}
    </div>
  );
}

export function ErrorState({
  title = "خطایی رخ داد",
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-red-200/80 bg-red-50/80 px-6 py-10 text-center dark:border-red-900/40 dark:bg-red-950/30",
        className,
      )}
      role="alert"
    >
      <p className="text-sm font-medium text-red-800 dark:text-red-200">
        {title}
      </p>
      {description ? (
        <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-red-700/90 dark:text-red-300/80">
          {description}
        </p>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 text-sm text-red-800 underline underline-offset-2 hover:text-red-950 dark:text-red-200"
        >
          تلاش مجدد
        </button>
      ) : null}
    </div>
  );
}
