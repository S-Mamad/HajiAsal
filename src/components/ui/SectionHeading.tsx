import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  align?: "start" | "center";
  variant?: "default" | "decorated";
  className?: string;
}

export function SectionHeading({
  title,
  subtitle,
  align = "start",
  variant = "default",
  className,
}: SectionHeadingProps) {
  if (variant === "decorated") {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-2 text-center",
          className,
        )}
      >
        <div className="flex w-full max-w-lg items-center gap-4">
          <span className="h-px flex-1 border-t border-gold/30" />
          <span className="text-xs text-gold">◆</span>
          <h2 className="shrink-0 text-xl font-bold tracking-tight text-primary md:text-2xl">
            {title}
          </h2>
          <span className="text-xs text-gold">◆</span>
          <span className="h-px flex-1 border-t border-gold/30" />
        </div>
        {subtitle ? (
          <p className="max-w-xl text-sm text-secondary md:text-base">
            {subtitle}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      <h2 className="text-lg font-bold tracking-tight text-primary sm:text-2xl md:text-3xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="max-w-xl text-xs leading-relaxed text-secondary sm:text-sm md:text-base">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
