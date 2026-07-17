import { getSessionFromCookies } from "@/lib/auth/session";
import { getOrdersByUserId } from "@/lib/server/orders";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatPrice } from "@/lib/utils";
import { hajiasalPath } from "@/lib/paths";
import Link from "next/link";

const statusLabels: Record<string, string> = {
  pending_payment: "در انتظار پرداخت",
  confirmed: "تأیید شده",
  processing: "در حال آماده‌سازی",
  shipped: "ارسال شده",
  delivered: "تحویل شده",
  cancelled: "لغو شده",
};

export default async function AccountOrdersPage() {
  const session = await getSessionFromCookies();
  const orders = session ? await getOrdersByUserId(session.userId) : [];

  return (
    <div>
      <SectionHeading title="سفارش‌های من" className="mb-8" />
      {orders.length === 0 ? (
        <p className="text-muted">سفارشی یافت نشد.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className="rounded-2xl border border-border bg-surface p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-brown" dir="ltr">
                    {order.id}
                  </p>
                  <p className="text-sm text-muted">
                    {statusLabels[order.status] ?? order.status}
                  </p>
                </div>
                <p className="font-semibold text-brown">
                  {formatPrice(order.total)}
                </p>
              </div>
              <p className="mt-2 text-xs text-muted">
                {new Date(order.createdAt).toLocaleDateString("fa-IR")}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {order.trackingCode ? (
                  <Link
                    href={`${hajiasalPath("/track-order")}?tracking=${order.trackingCode}`}
                    className="text-sm text-amber hover:underline"
                  >
                    پیگیری سفارش
                  </Link>
                ) : null}
                <a
                  href={`/api/orders/${order.id}/invoice?print=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-amber hover:underline"
                >
                  مشاهده / پرینت فاکتور
                </a>
                <a
                  href={`/api/orders/${order.id}/invoice?download=1`}
                  download
                  className="text-sm text-muted hover:text-brown hover:underline"
                >
                  دانلود فاکتور
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
