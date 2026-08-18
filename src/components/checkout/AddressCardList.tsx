"use client";

import { Check, Plus, TrashSimple } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { UserAddress } from "@/types/auth";
import { AddressCardSkeleton } from "@/components/ui/Skeleton";
import { Icon } from "@/components/ui/Icon";

interface AddressCardListProps {
  addresses: UserAddress[];
  selectedId: string | null;
  onSelect: (address: UserAddress) => void;
  onAdd: () => void;
  onDelete?: (id: string) => void;
  loading?: boolean;
}

function summaryLine(addr: UserAddress): string {
  const street = addr.address.trim();
  if (!addr.city) return street;
  if (!street) return addr.city;
  return `${addr.city} · ${street}`;
}

export function AddressCardList({
  addresses,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
  loading,
}: AddressCardListProps) {
  if (loading) return <AddressCardSkeleton />;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-semibold text-primary">
          سفارش به کجا ارسال شود؟
        </h2>
        {addresses.length > 0 ? (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex shrink-0 items-center gap-1 text-[12px] text-secondary transition hover:text-primary"
          >
            <Icon icon={Plus} size={12} weight="bold" />
            افزودن آدرس جدید
          </button>
        ) : null}
      </div>

      {addresses.length === 0 ? (
        <button
          type="button"
          onClick={onAdd}
          className="flex w-full flex-col items-center gap-0.5 rounded-xl border border-dashed border-border px-3 py-3 text-center transition hover:border-gold/40"
        >
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary">
            <Icon icon={Plus} size={14} weight="bold" />
            افزودن آدرس جدید
          </span>
          <span className="text-[11.5px] text-secondary">
            موقعیت را روی نقشه مشخص کنید
          </span>
        </button>
      ) : (
        <ul className="space-y-1.5">
          {addresses.map((addr) => {
            const selected = selectedId === addr.id;
            const name = addr.receiverName || addr.label || "گیرنده";
            return (
              <li key={addr.id}>
                <div
                  className={cn(
                    "flex items-center gap-1 rounded-xl border px-2.5 py-2 transition-colors",
                    selected
                      ? "border-gold/70 bg-gold-dim/35"
                      : "border-border bg-white",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(addr)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-start"
                  >
                    {selected ? (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gold text-ink-on-gold">
                        <Icon icon={Check} size={10} weight="bold" />
                      </span>
                    ) : (
                      <span className="h-4 w-4 shrink-0 rounded-full border border-border-bright" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-baseline gap-1.5">
                        <span className="truncate text-[13px] font-semibold leading-snug text-primary">
                          {name}
                          {addr.receiverPhone ? (
                            <span
                              className="ms-1.5 align-baseline text-[11px] font-normal tabular-nums text-secondary"
                              dir="ltr"
                            >
                              {addr.receiverPhone}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <span className="mt-px block truncate text-[11.5px] leading-snug text-secondary">
                        {summaryLine(addr)}
                      </span>
                    </span>
                  </button>
                  {onDelete ? (
                    <button
                      type="button"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-dim transition hover:bg-red-50 hover:text-red-600"
                      aria-label="حذف آدرس"
                      onClick={() => onDelete(addr.id)}
                    >
                      <Icon icon={TrashSimple} size={14} />
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
