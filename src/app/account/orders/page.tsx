import Link from "next/link";
import { Package } from "@phosphor-icons/react/dist/ssr";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getOrdersByUserId } from "@/lib/server/orders";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { AccountOrderCard } from "@/components/account/AccountOrderCard";
import { formatPersianNumber } from "@/lib/utils";
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
            <AccountOrderCard key={order.id} order={order} />
          ))}
        </ul>
      )}

      {orders.length > 0 ? (
        <p className="mt-6 text-center text-xs text-dim">
          برای پیگیری ارسال بدون ورود، از صفحه{" "}
          <Link
            href={hajiasalPath("/track-order")}
            className="inline-flex items-center gap-1 text-gold hover:underline"
          >
            <Package size={12} />
            پیگیری سفارش
          </Link>{" "}
          هم می‌توانید استفاده کنید.
        </p>
      ) : null}
    </div>
  );
}
