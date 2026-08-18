"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle,
  MapPin,
  Plus,
  Star,
  TrashSimple,
} from "@phosphor-icons/react";
import type { UserAddress } from "@/types/auth";
import { Button } from "@/components/ui/Button";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { AccountSkeleton } from "@/components/account/AccountSkeleton";
import {
  AddressMapSheet,
  type NewAddressPayload,
} from "@/components/checkout/AddressMapSheet";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type AddressesPageClientProps = {
  initialAddresses?: UserAddress[];
};

export function AddressesPageClient({
  initialAddresses,
}: AddressesPageClientProps) {
  const { user } = useAuth();
  const hasInitial = initialAddresses !== undefined;
  const [addresses, setAddresses] = useState<UserAddress[]>(
    initialAddresses ?? [],
  );
  const [loading, setLoading] = useState(!hasInitial);
  const [mapOpen, setMapOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [defaultingId, setDefaultingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/account/addresses");
      if (!r.ok) throw new Error("failed");
      const d = (await r.json()) as { addresses?: UserAddress[] };
      setAddresses(d.addresses ?? []);
    } catch {
      setError("بارگذاری آدرس‌ها ممکن نشد.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasInitial) return;
    void load();
  }, [hasInitial, load]);

  const onSaved = async (payload: NewAddressPayload) => {
    const res = await fetch("/api/account/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        isDefault: addresses.length === 0 ? true : payload.isDefault,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
      error?: string;
    };
    if (!res.ok || !data.success) {
      throw new Error(
        data.message && /[\u0600-\u06FF]/.test(data.message)
          ? data.message
          : data.error && /[\u0600-\u06FF]/.test(data.error)
            ? data.error
            : "ذخیره آدرس ناموفق بود",
      );
    }
    setMapOpen(false);
    setError("");
    await load();
  };

  const onDelete = async (id: string) => {
    setDeletingId(id);
    setError("");
    try {
      const res = await fetch(`/api/account/addresses?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError("حذف آدرس انجام نشد.");
        return;
      }
      await load();
    } catch {
      setError("حذف آدرس ممکن نشد.");
    } finally {
      setDeletingId(null);
    }
  };

  const onSetDefault = async (id: string) => {
    setDefaultingId(id);
    setError("");
    try {
      const res = await fetch("/api/account/addresses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "setDefault" }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        addresses?: UserAddress[];
      };
      if (!res.ok) {
        setError(data.error ?? "تنظیم آدرس پیش‌فرض انجام نشد.");
        return;
      }
      if (Array.isArray(data.addresses)) {
        setAddresses(data.addresses);
      } else {
        await load();
      }
    } catch {
      setError("تنظیم آدرس پیش‌فرض ممکن نشد.");
    } finally {
      setDefaultingId(null);
    }
  };

  if (loading) {
    return (
      <div>
        <AccountPageHeader title="آدرس‌های من" subtitle="در حال بارگذاری..." />
        <AccountSkeleton rows={2} rowClassName="h-28" />
      </div>
    );
  }

  return (
    <div>
      <AccountPageHeader
        title="آدرس‌های من"
        subtitle="موقعیت را روی نقشه مشخص کنید تا در خرید بعدی خودکار پر شود."
        action={
          <Button
            type="button"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => {
              setError("");
              setMapOpen(true);
            }}
          >
            <Icon icon={Plus} size={16} weight="bold" />
            آدرس جدید
          </Button>
        }
      />

      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-red-200/80 bg-red-50/80 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
        >
          {error}
        </p>
      ) : null}

      {addresses.length === 0 ? (
        <button
          type="button"
          onClick={() => {
            setError("");
            setMapOpen(true);
          }}
          className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-4 py-10 text-center transition hover:border-gold/40 hover:bg-gold-dim/20"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-dim text-gold">
            <Icon icon={MapPin} size={22} weight="duotone" />
          </span>
          <span className="text-sm font-semibold text-primary">
            اولین آدرس را از روی نقشه اضافه کنید
          </span>
          <span className="max-w-xs text-[12.5px] leading-relaxed text-secondary">
            پین را روی محل تحویل بگذارید؛ استان، شهر و جزئیات از نقشه پر می‌شود.
          </span>
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-[12.5px] font-semibold text-ink-on-gold">
            <Icon icon={Plus} size={14} weight="bold" />
            افزودن با نقشه
          </span>
        </button>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {addresses.map((addr) => {
            const name = addr.receiverName || addr.label || "گیرنده";
            const busy =
              deletingId === addr.id || defaultingId === addr.id;
            return (
              <li key={addr.id}>
                <article
                  className={cn(
                    "rounded-2xl border bg-white px-3.5 py-3 shadow-sm transition dark:bg-surface",
                    addr.isDefault
                      ? "border-gold/60 bg-gold-dim/25"
                      : "border-border",
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <Icon
                      icon={CheckCircle}
                      size={20}
                      weight={addr.isDefault ? "fill" : "regular"}
                      className={cn(
                        "mt-0.5 shrink-0",
                        addr.isDefault ? "text-gold" : "text-border-bright",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[14px] font-semibold text-primary">
                          {name}
                        </p>
                        {addr.isDefault ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-gold-dim px-2 py-0.5 text-[10px] font-medium text-gold">
                            <Icon icon={Star} size={10} weight="fill" />
                            پیش‌فرض
                          </span>
                        ) : null}
                        {addr.label && addr.receiverName ? (
                          <span className="rounded-md bg-surface-muted px-2 py-0.5 text-[10px] text-secondary">
                            {addr.label}
                          </span>
                        ) : null}
                      </div>
                      {addr.receiverPhone ? (
                        <p
                          className="mt-0.5 text-[12px] tabular-nums text-secondary"
                          dir="ltr"
                        >
                          {addr.receiverPhone}
                        </p>
                      ) : null}
                      <p className="mt-1.5 text-[12.5px] text-secondary">
                        {addr.city}
                        {addr.province ? `، ${addr.province}` : ""}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-relaxed text-secondary">
                        {addr.address}
                        {addr.plaque ? `، پلاک ${addr.plaque}` : ""}
                        {addr.unit ? `، واحد ${addr.unit}` : ""}
                      </p>
                      {addr.postalCode ? (
                        <p
                          className="mt-1.5 inline-flex items-center gap-1 text-[11px] tabular-nums text-dim"
                          dir="ltr"
                        >
                          <Icon icon={MapPin} size={11} weight="fill" />
                          {addr.postalCode}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-end gap-1 border-t border-border/60 pt-2">
                    {!addr.isDefault ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onSetDefault(addr.id)}
                        className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11.5px] font-medium text-gold transition hover:bg-gold-dim disabled:opacity-50"
                      >
                        <Icon icon={Star} size={13} weight="duotone" />
                        {defaultingId === addr.id
                          ? "در حال تنظیم..."
                          : "پیش‌فرض کردن"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onDelete(addr.id)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11.5px] text-dim transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/40"
                    >
                      <Icon icon={TrashSimple} size={14} />
                      {deletingId === addr.id ? "در حال حذف..." : "حذف"}
                    </button>
                  </div>
                </article>
              </li>
            );
          })}

          <li>
            <button
              type="button"
              onClick={() => {
                setError("");
                setMapOpen(true);
              }}
              className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border text-[13px] text-secondary transition hover:border-gold/40 hover:bg-gold-dim/15 hover:text-primary"
            >
              <Icon icon={Plus} size={15} weight="bold" />
              افزودن آدرس جدید روی نقشه
            </button>
          </li>
        </ul>
      )}

      <AddressMapSheet
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        defaultReceiverName={user?.fullName ?? ""}
        defaultReceiverPhone={user?.phone ?? ""}
        onSaved={onSaved}
      />
    </div>
  );
}
