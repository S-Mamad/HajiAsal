import Link from "next/link";
import {
  Package,
  FileText,
  DownloadSimple,
  CaretDown,
} from "@phosphor-icons/react/dist/ssr";
import type { StoredOrder } from "@/lib/server/orders";
import { AccountSurface } from "@/components/account/AccountSurface";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";
import { ProductImage } from "@/components/ui/ProductImage";
import {
  formatPrice,
  formatPersianNumber,
  formatJalaliDate,
} from "@/lib/utils";
import { hajiasalPath } from "@/lib/paths";

export function AccountOrderCard({ order }: { order: StoredOrder }) {
  const preview = order.items.slice(0, 4);
  const extraCount = Math.max(0, order.items.length - preview.length);

  return (
    <AccountSurface as="li" padded={false} className="list-none">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-elevated/35 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p
            className="truncate font-mono text-sm font-medium text-primary"
            dir="ltr"
          >
            {order.id}
          </p>
          <p className="mt-0.5 text-xs text-secondary">
            {formatJalaliDate(order.createdAt)}
            {order.items.length > 0
              ? ` · ${formatPersianNumber(order.items.length)} قلم`
              : null}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {preview.length > 0 ? (
        <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3 sm:px-5">
          <div className="flex -space-x-2 space-x-reverse">
            {preview.map((item) => (
              <div
                key={`${item.productId}-${item.weight.grams}`}
                className="relative h-11 w-11 overflow-hidden rounded-xl border-2 border-surface bg-surface-muted ring-1 ring-border"
                title={item.title}
              >
                <ProductImage
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="44px"
                  className="object-cover"
                />
              </div>
            ))}
            {extraCount > 0 ? (
              <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border-2 border-surface bg-surface-muted text-[11px] font-semibold tabular-nums text-secondary ring-1 ring-border">
                +{formatPersianNumber(extraCount)}
              </div>
            ) : null}
          </div>
          <p className="min-w-0 flex-1 truncate text-xs text-secondary">
            {order.items
              .slice(0, 2)
              .map((i) => i.title)
              .join("، ")}
            {order.items.length > 2 ? " و ..." : null}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3 px-4 py-4 sm:px-5">
        <div>
          <p className="text-[11px] text-secondary">مبلغ سفارش</p>
          <p className="mt-0.5 text-base font-bold tabular-nums text-gold">
            {formatPrice(order.total)}
          </p>
          {order.trackingCode ? (
            <p className="mt-2 text-xs text-secondary">
              پیگیری:{" "}
              <span className="font-mono text-primary" dir="ltr">
                {order.trackingCode}
              </span>
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {order.trackingCode ? (
            <Link
              href={`${hajiasalPath("/track-order")}?tracking=${order.trackingCode}`}
              className="inline-flex items-center gap-1 text-sm text-gold transition-colors hover:text-gold-bright focus-visible:outline-none focus-visible:underline"
            >
              <Package size={15} />
              پیگیری
            </Link>
          ) : null}
          <a
            href={`/api/orders/${order.id}/invoice?print=1`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-gold transition-colors hover:text-gold-bright focus-visible:outline-none focus-visible:underline"
          >
            <FileText size={15} />
            فاکتور
          </a>
          <a
            href={`/api/orders/${order.id}/invoice?download=1`}
            download
            className="inline-flex items-center gap-1 text-sm text-secondary transition-colors hover:text-primary focus-visible:outline-none focus-visible:underline"
          >
            <DownloadSimple size={15} />
            دانلود
          </a>
        </div>
      </div>

      {order.items.length > 0 ? (
        <details className="group border-t border-border">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm text-secondary transition-colors hover:bg-surface-muted/50 hover:text-primary sm:px-5 [&::-webkit-details-marker]:hidden">
            <span>جزئیات اقلام و مبلغ</span>
            <CaretDown
              size={16}
              className="shrink-0 transition-transform duration-200 group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="space-y-3 border-t border-border/70 bg-surface-elevated/25 px-4 py-4 sm:px-5">
            <ul className="flex flex-col gap-2.5">
              {order.items.map((item) => (
                <li
                  key={`${item.productId}-${item.weight.grams}`}
                  className="flex gap-3"
                >
                  <Link
                    href={hajiasalPath(`/product/${item.slug}`)}
                    className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-muted"
                  >
                    <ProductImage
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={hajiasalPath(`/product/${item.slug}`)}
                      className="block truncate text-sm font-medium text-primary hover:text-gold"
                    >
                      {item.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-secondary">
                      {item.weight.label}
                      {" · "}
                      {formatPersianNumber(item.quantity)} عدد
                    </p>
                    <p className="mt-1 text-xs font-medium tabular-nums text-primary">
                      {formatPrice(item.weight.price * item.quantity)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <dl className="space-y-1.5 border-t border-border pt-3 text-xs">
              <div className="flex justify-between gap-3 text-secondary">
                <dt>جمع اقلام</dt>
                <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-3 text-secondary">
                <dt>ارسال</dt>
                <dd className="tabular-nums">{formatPrice(order.shipping)}</dd>
              </div>
              {order.discount > 0 ? (
                <div className="flex justify-between gap-3 text-emerald-700 dark:text-emerald-400">
                  <dt>تخفیف</dt>
                  <dd className="tabular-nums">
                    −{formatPrice(order.discount)}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-3 pt-1 text-sm font-semibold text-primary">
                <dt>مبلغ نهایی</dt>
                <dd className="tabular-nums text-gold">
                  {formatPrice(order.total)}
                </dd>
              </div>
            </dl>
          </div>
        </details>
      ) : null}
    </AccountSurface>
  );
}
