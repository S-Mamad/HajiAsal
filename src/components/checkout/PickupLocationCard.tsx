"use client";

import { MapPin, Phone } from "@phosphor-icons/react";

interface PickupLocationCardProps {
  address: string;
  phone?: string;
  receiverName?: string;
}

export function PickupLocationCard({
  address,
  phone,
  receiverName,
}: PickupLocationCardProps) {
  return (
    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
      <p className="text-sm font-semibold text-primary">تحویل حضوری از انبار</p>
      <p className="mt-1 text-xs leading-relaxed text-secondary">
        آدرس پستی لازم نیست؛ سفارش را از همین واحد تحویل بگیرید.
      </p>
      <div className="mt-3 flex gap-2.5 text-sm text-primary">
        <MapPin
          size={18}
          weight="duotone"
          className="mt-0.5 shrink-0 text-amber-700"
          aria-hidden
        />
        <p className="leading-relaxed">{address}</p>
      </div>
      {phone ? (
        <a
          href={`tel:${phone.replace(/\s+/g, "")}`}
          className="mt-2.5 flex items-center gap-2.5 text-sm text-primary underline-offset-2 hover:underline"
          dir="ltr"
        >
          <Phone
            size={18}
            weight="duotone"
            className="shrink-0 text-amber-700"
            aria-hidden
          />
          {phone}
        </a>
      ) : null}
      {receiverName ? (
        <p className="mt-3 text-xs text-secondary">
          تحویل‌گیرنده:{" "}
          <span className="font-medium text-primary">{receiverName}</span>
        </p>
      ) : null}
    </div>
  );
}
