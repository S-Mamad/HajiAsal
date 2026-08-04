import Link from "next/link";
import {
  Package,
  MapPin,
  Heart,
  User,
  Truck,
  ShieldCheck,
  ArrowLeft,
} from "@phosphor-icons/react/dist/ssr";
import { getSessionFromCookies } from "@/lib/auth/session";
import {
  findProfileById,
  getAddressesByUserId,
  getWishlistProductIds,
} from "@/lib/server/profiles";
import { getOrdersByUserId } from "@/lib/server/orders";
import { Button } from "@/components/ui/Button";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";
import {
  cn,
  formatPrice,
  formatPersianNumber,
  formatJalaliDate,
} from "@/lib/utils";
import { hajiasalPath } from "@/lib/paths";

const quickLinks = [
  {
    href: hajiasalPath("/account/orders"),
    label: "سفارش‌ها",
    desc: "وضعیت و فاکتور",
    icon: Package,
  },
  {
    href: hajiasalPath("/account/addresses"),
    label: "آدرس‌ها",
    desc: "آدرس ارسال",
    icon: MapPin,
  },
  {
    href: hajiasalPath("/account/wishlist"),
    label: "علاقه‌مندی‌ها",
    desc: "محصولات ذخیره‌شده",
    icon: Heart,
  },
  {
    href: hajiasalPath("/account/profile"),
    label: "پروفایل",
    desc: "نام و تماس",
    icon: User,
  },
] as const;

export default async function AccountPage() {
  const session = await getSessionFromCookies();
  const profile = session ? await findProfileById(session.userId) : null;
  const orders = session ? await getOrdersByUserId(session.userId) : [];
  const addresses = session
    ? await getAddressesByUserId(session.userId)
    : [];
  const wishlistIds = session
    ? await getWishlistProductIds(session.userId)
    : [];

  const lastOrder = orders[0];
  const activeOrders = orders.filter(
    (o) =>
      o.status !== "delivered" &&
      o.status !== "cancelled" &&
      o.status !== "pending_payment",
  ).length;
  const displayName = profile?.fullName?.trim() || "مشتری عزیز";

  const stats = [
    {
      label: "کل سفارش‌ها",
      value: formatPersianNumber(orders.length),
      hint: activeOrders > 0 ? `${formatPersianNumber(activeOrders)} در جریان` : "همه تکمیل یا خالی",
    },
    {
      label: "آدرس‌های ذخیره‌شده",
      value: formatPersianNumber(addresses.length),
      hint: addresses.some((a) => a.isDefault) ? "آدرس پیش‌فرض فعال است" : "آدرس پیش‌فرض ندارید",
    },
    {
      label: "علاقه‌مندی‌ها",
      value: formatPersianNumber(wishlistIds.length),
      hint: "برای خرید سریع‌تر",
    },
  ];

  return (
    <div>
      <AccountPageHeader
        title={`سلام، ${displayName}`}
        subtitle="از این پنل سفارش‌ها، آدرس‌ها و اطلاعات حساب خود را مدیریت کنید."
      />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border bg-surface p-4"
          >
            <p className="text-xs text-secondary">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-primary">
              {stat.value}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-dim">
              {stat.hint}
            </p>
          </div>
        ))}
      </div>

      {lastOrder ? (
        <section className="mb-6 overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-semibold text-primary">آخرین سفارش</h2>
            <OrderStatusBadge status={lastOrder.status} />
          </div>
          <div className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-sm font-medium text-primary" dir="ltr">
                  {lastOrder.id}
                </p>
                <p className="mt-1 text-xs text-secondary">
                  {formatJalaliDate(lastOrder.createdAt)}
                  {lastOrder.items.length > 0
                    ? ` · ${formatPersianNumber(lastOrder.items.length)} قلم`
                    : null}
                </p>
              </div>
              <p className="text-base font-bold tabular-nums text-gold">
                {formatPrice(lastOrder.total)}
              </p>
            </div>

            {lastOrder.trackingCode ? (
              <p className="mt-3 rounded-xl bg-surface-muted px-3 py-2 text-xs text-secondary">
                کد پیگیری:{" "}
                <span className="font-mono font-medium text-primary" dir="ltr">
                  {lastOrder.trackingCode}
                </span>
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {lastOrder.trackingCode ? (
                <Button
                  href={`${hajiasalPath("/track-order")}?tracking=${lastOrder.trackingCode}`}
                  variant="outline"
                  size="sm"
                >
                  پیگیری ارسال
                </Button>
              ) : null}
              <Button href={hajiasalPath("/account/orders")} size="sm">
                همه سفارش‌ها
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <section className="mb-6 rounded-2xl border border-dashed border-border-bright bg-surface px-5 py-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gold-dim text-gold">
            <Package size={22} weight="duotone" />
          </div>
          <p className="text-sm font-medium text-primary">هنوز سفارشی ثبت نکرده‌اید</p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-secondary">
            عسل‌های اصل حاجی‌عسل را از فروشگاه انتخاب کنید؛ وضعیت سفارش همین‌جا نمایش داده می‌شود.
          </p>
          <div className="mt-5">
            <Button href={hajiasalPath("/shop")}>رفتن به فروشگاه</Button>
          </div>
        </section>
      )}

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-primary">دسترسی سریع</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group rounded-2xl border border-border bg-surface p-4 transition-colors",
                "hover:border-gold/35 hover:bg-gold/[0.04]",
              )}
            >
              <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gold-dim text-gold transition-transform group-hover:scale-105">
                <item.icon size={18} weight="duotone" />
              </span>
              <p className="text-sm font-medium text-primary">{item.label}</p>
              <p className="mt-0.5 text-[11px] text-secondary">{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          href={hajiasalPath("/authenticity")}
          className="flex gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-gold/30"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-dim text-gold">
            <ShieldCheck size={20} weight="duotone" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary">ضمانت اصالت</p>
            <p className="mt-0.5 text-xs leading-relaxed text-secondary">
              هر شیشه با شناسه پیگیری و تضمین کیفیت طبیعی عرضه می‌شود.
            </p>
          </div>
        </Link>
        <Link
          href={hajiasalPath("/shipping")}
          className="flex gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-gold/30"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-dim text-gold">
            <Truck size={20} weight="duotone" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary">ارسال و تحویل</p>
            <p className="mt-0.5 text-xs leading-relaxed text-secondary">
              جزئیات زمان‌بندی ارسال و هزینه را قبل از خرید ببینید.
            </p>
          </div>
        </Link>
      </section>

      <div className="mt-8">
        <Link
          href={hajiasalPath("/shop")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gold transition-colors hover:text-gold-bright"
        >
          ادامه خرید از فروشگاه
          <ArrowLeft size={16} />
        </Link>
      </div>
    </div>
  );
}
