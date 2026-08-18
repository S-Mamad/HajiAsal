import { ArrowCounterClockwise, SealCheck, ShieldCheck } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const DEFAULT_ITEMS = [
  { icon: ShieldCheck, label: "پرداخت امن" },
  { icon: ArrowCounterClockwise, label: "۷ روز ضمانت بازگشت" },
  { icon: SealCheck, label: "تضمین اصالت کالا" },
] as const;

export function TrustSignals({ className }: { className?: string }) {
  return (
    <ul
      className={cn(
        "grid grid-cols-3 gap-2 text-center",
        className,
      )}
      aria-label="نشان‌های اطمینان"
    >
      {DEFAULT_ITEMS.map(({ icon: Icon, label }) => (
        <li
          key={label}
          className="flex flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-secondary"
        >
          <Icon size={20} weight="duotone" className="text-secondary" />
          <span className="text-[10px] leading-tight sm:text-[11px]">
            {label}
          </span>
        </li>
      ))}
    </ul>
  );
}
