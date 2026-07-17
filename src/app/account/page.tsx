import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth/session";
import { findProfileById } from "@/lib/server/profiles";
import { getOrdersByUserId } from "@/lib/server/orders";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";
import { hajiasalPath } from "@/lib/paths";

export default async function AccountPage() {
  const session = await getSessionFromCookies();
  const profile = session ? await findProfileById(session.userId) : null;
  const orders = session ? await getOrdersByUserId(session.userId) : [];
  const lastOrder = orders[0];

  return (
    <div>
      <SectionHeading
        title={`سلام، ${profile?.fullName ?? "مشتری عزیز"}`}
        subtitle="از اینجا سفارش‌ها و اطلاعات حساب خود را مدیریت کنید"
        className="mb-8"
      />

      {lastOrder ? (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="mb-2 text-sm font-semibold text-brown">آخرین سفارش</h2>
          <p className="text-sm text-muted" dir="ltr">
            {lastOrder.id}
          </p>
          <p className="mt-1 text-sm font-medium text-brown">
            {formatPrice(lastOrder.total)}
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              href={`${hajiasalPath("/track-order")}?tracking=${lastOrder.trackingCode}`}
              variant="outline"
              size="sm"
            >
              پیگیری
            </Button>
            <Button href={hajiasalPath("/account/orders")} size="sm">
              همه سفارش‌ها
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="mb-4 text-muted">هنوز سفارشی ثبت نکرده‌اید.</p>
          <Button href={hajiasalPath("/shop")}>رفتن به فروشگاه</Button>
        </div>
      )}

      <div className="mt-8">
        <Link
          href={hajiasalPath("/shop")}
          className="text-sm text-amber hover:underline"
        >
          ادامه خرید
        </Link>
      </div>
    </div>
  );
}
