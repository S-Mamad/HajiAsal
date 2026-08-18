import { cn } from "@/lib/utils";

type PriceTextProps = {
  amount: number;
  className?: string;
};

/** One-line price: number + compact تومان so cart cards do not wrap. */
export function PriceText({ amount, className }: PriceTextProps) {
  const value = Number.isFinite(amount) ? amount : 0;
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-baseline gap-0.5 whitespace-nowrap tabular-nums",
        className,
      )}
    >
      <span className="min-w-0">{value.toLocaleString("fa-IR")}</span>
      <span className="shrink-0 text-[0.72em] font-medium opacity-75">
        تومان
      </span>
    </span>
  );
}
