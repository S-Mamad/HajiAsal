import { cn } from "@/lib/utils";

type Props = {
  live?: boolean;
  className?: string;
};

/** 8px presence pip. Live = emerald, otherwise muted. */
export function SupportPresenceDot({ live = true, className }: Props) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute end-[3px] bottom-[3px] h-2 w-2 rounded-full",
        "ring-[2px] ring-surface",
        live ? "bg-emerald-500" : "bg-stone-300",
        className,
      )}
      aria-hidden
    />
  );
}
