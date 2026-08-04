import Link from "next/link";
import { Package, FileText, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getOrdersByUserId } from "@/lib/server/orders";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";
import {
  formatPrice,
  formatPersianNumber,
  formatJalaliDate,
} from "@/lib/utils";
import { hajiasalPath } from "@/lib/paths";

export default async function AccountOrdersPage() {
  const session = await getSessionFromCookies();
  const orders = session ? await getOrdersByUserId(session.userId) : [];

  return (
    <div>
      <AccountPageHeader
        title="سفارش‌های من"
        subtitle={
          orders.length > 0
            ? `${formatPersianNumber(orders.length)} سفارش ثبت‌شده`
            : "پس از خرید، وضعیت و فاکتور سفارش‌ها اینجا می‌آید."
        }
      />

      {orders.length === 0 ? (
        <EmptyState
          title="هنوز سفارشی ندارید"
          description="عسل اصل را از فروشگاه انتخاب کنید؛ پیگیری ارسال و فاکتور همین‌جا در دسترس است."
          action={
            <Button href={hajiasalPath("/shop")}>رفتن به فروشگاه</Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3 sm:gap-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className="overflow-hidden rounded-2xl border border-border bg-surface"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
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
                      className="inline-flex items-center gap-1 text-sm text-gold hover:underline"
                    >
                      <Package size={15} />
                      پیگیری
                    </Link>
                  ) : null}
                  <a
                    href={`/api/orders/${order.id}/invoice?print=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-gold hover:underline"
                  >
                    <FileText size={15} />
                    فاکتور
                  </a>
                  <a
                    href={`/api/orders/${order.id}/invoice?download=1`}
                    download
                    className="inline-flex items-center gap-1 text-sm text-secondary hover:text-primary hover:underline"
                  >
                    <DownloadSimple size={15} />
                    دانلود
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
