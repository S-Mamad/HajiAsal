import { cn } from "@/lib/utils";

type Props = {
  live?: boolean;
  className?: string;
};

/** Shared presence pip — styles live in globals.css (.support-presence-dot). */
export function SupportPresenceDot({ live = true, className }: Props) {
  return (
    <span
      className={cn(
        "support-presence-dot",
        live ? "support-presence-dot--live" : "support-presence-dot--idle",
        className,
      )}
      aria-hidden
    />
  );
}
