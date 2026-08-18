"use client";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface CouponTrapProps {
  code: string;
  onCodeChange: (code: string) => void;
  onApply: () => void;
  onClear?: () => void;
  busy?: boolean;
  message?: string;
  discount?: number;
}

export function CouponTrap({
  code,
  onCodeChange,
  onApply,
  onClear,
  busy,
  message,
  discount = 0,
}: CouponTrapProps) {
  const invalid = Boolean(message) && discount <= 0;
  const applied = discount > 0;

  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-stretch gap-2">
        <input
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="کد تخفیف"
          dir="ltr"
          value={code}
          aria-invalid={invalid}
          aria-describedby={message ? "checkout-coupon-status" : undefined}
          onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (code.trim() && !busy) onApply();
            }
          }}
          className={cn(
            "h-10 min-w-0 flex-1 basis-0 rounded-xl border bg-surface-elevated px-3 text-sm text-primary",
            "placeholder:text-dim focus:outline-none",
            invalid
              ? "border-red-500 focus:border-red-500"
              : "border-border focus:border-gold/50 focus:ring-1 focus:ring-gold/30",
          )}
          aria-label="کد تخفیف"
        />
        {applied && onClear ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onClear}
            className="h-10 w-[4.75rem] shrink-0 px-0 sm:w-auto sm:px-3.5"
          >
            حذف
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={busy || !code.trim()}
            onClick={onApply}
            className="h-10 w-[4.75rem] shrink-0 px-0 sm:w-auto sm:px-3.5"
          >
            {busy ? "..." : "اعمال"}
          </Button>
        )}
      </div>
      {message ? (
        <p
          id="checkout-coupon-status"
          className={cn(
            "mt-1.5 break-words text-[12px] leading-5",
            invalid ? "text-red-600 dark:text-red-300" : "text-secondary",
          )}
          role={invalid ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
