import { cn } from "@/lib/utils";

interface AccountPageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
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
        "mb-7 flex flex-wrap items-end justify-between gap-4 sm:mb-8",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-primary sm:text-2xl md:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-secondary">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
