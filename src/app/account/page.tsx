import Link from "next/link";
import {
  Package,
  MapPin,
  Heart,
  Truck,
  ShieldCheck,
  ArrowLeft,
  ChatCircle,
  CaretLeft,
} from "@/components/account/AccountIcons";
import { getSessionFromCookies } from "@/lib/auth/session";
import {
  findProfileById,
  getAddressesByUserId,
  getWishlistProductIds,
} from "@/lib/server/profiles";
import { getOrdersByUserId } from "@/lib/server/orders";
import { Button } from "@/components/ui/Button";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { AccountSurface } from "@/components/account/AccountSurface";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";
import { ProductImage } from "@/components/ui/ProductImage";
import {
  cn,
  formatPrice,
  formatPersianNumber,
  formatJalaliDate,
} from "@/lib/utils";
import { hajiasalPath } from "@/lib/paths";

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
  const firstName = displayName.split(/\s+/)[0] || displayName;

  const stats = [
    {
      label: "سفارش‌ها",
      value: formatPersianNumber(orders.length),
      hint:
        activeOrders > 0
          ? `${formatPersianNumber(activeOrders)} در جریان`
          : "بدون سفارش فعال",
      href: hajiasalPath("/account/orders"),
      icon: Package,
    },
    {
      label: "آدرس‌ها",
      value: formatPersianNumber(addresses.length),
      hint: addresses.some((a) => a.isDefault)
        ? "پیش‌فرض تنظیم شده"
        : "آدرس پیش‌فرض ندارید",
      href: hajiasalPath("/account/addresses"),
      icon: MapPin,
    },
    {
      label: "علاقه‌مندی",
      value: formatPersianNumber(wishlistIds.length),
      hint: "محصول ذخیره‌شده",
      href: hajiasalPath("/account/wishlist"),
      icon: Heart,
    },
    {
      label: "پشتیبانی",
      value: "گفتگو",
      hint: "سوال یا پیگیری سفارش",
      href: hajiasalPath("/account/tickets"),
      icon: ChatCircle,
    },
  ];

  return (
    <div>
      <AccountPageHeader
        eyebrow="حساب کاربری"
        title={`سلام، ${firstName}`}
        subtitle="سفارش‌ها، آدرس‌ها و پشتیبانی را از یکجا مدیریت کنید."
        action={
          <Button href={hajiasalPath("/shop")} size="sm" className="w-full sm:w-auto">
            ادامه خرید
            <ArrowLeft size={15} />
          </Button>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={cn(
              "account-stat group rounded-2xl border border-border/90 bg-surface p-3.5 transition-[border-color,transform,box-shadow] duration-200 sm:p-4",
              "hover:border-gold/30 hover:shadow-[0_8px_24px_-16px_var(--gold-glow)] active:scale-[0.99]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/45 focus-visible:ring-offset-2 focus-visible:ring-offset-void",
            )}
          >
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold-dim/80 text-gold">
                <stat.icon size={16} weight="duotone" />
              </span>
              <CaretLeft
                size={13}
                className="text-dim opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
              />
            </div>
            <p className="text-[11px] text-secondary">{stat.label}</p>
            <p className="mt-0.5 text-xl font-bold tabular-nums tracking-tight text-primary sm:text-2xl">
              {stat.value}
            </p>
            <p className="mt-1 hidden text-[10px] leading-relaxed text-dim sm:block">
              {stat.hint}
            </p>
          </Link>
        ))}
      </div>

      {lastOrder ? (
        <AccountSurface as="section" padded={false} className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 px-5 py-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-gold/85">
                آخرین سفارش
              </p>
              <h2
                className="mt-1 font-mono text-sm font-medium text-primary"
                dir="ltr"
              >
                {lastOrder.id}
              </h2>
            </div>
            <OrderStatusBadge status={lastOrder.status} />
          </div>
          <div className="p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs text-secondary">
                  {formatJalaliDate(lastOrder.createdAt)}
                  {lastOrder.items.length > 0
                    ? ` · ${formatPersianNumber(lastOrder.items.length)} قلم`
                    : null}
                </p>
                {lastOrder.items.length > 0 ? (
                  <div className="mt-3 flex items-center gap-2.5">
                    <div className="flex -space-x-2 space-x-reverse">
                      {lastOrder.items.slice(0, 4).map((item) => (
                        <div
                          key={`${item.productId}-${item.weight.grams}`}
                          className="relative h-11 w-11 overflow-hidden rounded-xl border-2 border-surface bg-surface-muted ring-1 ring-border/80"
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
                    </div>
                    <p className="min-w-0 flex-1 truncate text-xs text-secondary">
                      {lastOrder.items
                        .slice(0, 2)
                        .map((i) => i.title)
                        .join("، ")}
                      {lastOrder.items.length > 2 ? " و ..." : null}
                    </p>
                  </div>
                ) : null}
              </div>
              <p className="text-lg font-bold tabular-nums text-gold">
                {formatPrice(lastOrder.total)}
              </p>
            </div>

            {lastOrder.trackingCode ? (
              <p className="mt-4 rounded-xl bg-surface-muted/80 px-3.5 py-2.5 text-xs text-secondary">
                کد پیگیری:{" "}
                <span className="font-mono font-medium text-primary" dir="ltr">
                  {lastOrder.trackingCode}
                </span>
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
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
        </AccountSurface>
      ) : (
        <AccountSurface
          as="section"
          className="mb-8 border-dashed border-border-bright px-5 py-12 text-center"
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-dim text-gold">
            <Package size={24} weight="duotone" />
          </div>
          <p className="font-display text-lg font-bold text-primary">
            هنوز سفارشی ثبت نکرده‌اید
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-secondary">
            عسل‌های اصل حاجی‌عسل را از فروشگاه انتخاب کنید؛ وضعیت سفارش همین‌جا
            نمایش داده می‌شود.
          </p>
          <div className="mt-6">
            <Button href={hajiasalPath("/shop")}>رفتن به فروشگاه</Button>
          </div>
        </AccountSurface>
      )}

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          href={hajiasalPath("/authenticity")}
          className="account-surface group flex gap-3.5 rounded-2xl border border-border/90 bg-surface p-4 transition-[border-color] duration-200 hover:border-gold/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/45 focus-visible:ring-offset-2 focus-visible:ring-offset-void"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-dim/80 text-gold transition-transform duration-200 group-hover:scale-105">
            <ShieldCheck size={20} weight="duotone" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary">ضمانت اصالت</p>
            <p className="mt-1 text-xs leading-relaxed text-secondary">
              هر شیشه با شناسه پیگیری و تضمین کیفیت طبیعی عرضه می‌شود.
            </p>
          </div>
        </Link>
        <Link
          href={hajiasalPath("/shipping")}
          className="account-surface group flex gap-3.5 rounded-2xl border border-border/90 bg-surface p-4 transition-[border-color] duration-200 hover:border-gold/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/45 focus-visible:ring-offset-2 focus-visible:ring-offset-void"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-dim/80 text-gold transition-transform duration-200 group-hover:scale-105">
            <Truck size={20} weight="duotone" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary">ارسال و تحویل</p>
            <p className="mt-1 text-xs leading-relaxed text-secondary">
              جزئیات زمان‌بندی ارسال و هزینه را قبل از خرید ببینید.
            </p>
          </div>
        </Link>
      </section>
    </div>
  );
}
