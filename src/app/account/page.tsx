import Link from "next/link";
import {
  Package,
  MapPin,
  Heart,
  User,
  Truck,
  ShieldCheck,
  ArrowLeft,
  ChatCircle,
  CaretLeft,
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

const quickLinks = [
  {
    href: hajiasalPath("/account/orders"),
    label: "سفارش‌ها",
    desc: "وضعیت و فاکتور",
    icon: Package,
  },
  {
    href: hajiasalPath("/account/tickets"),
    label: "پشتیبانی",
    desc: "گفتگو با تیم",
    icon: ChatCircle,
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
  const firstName = displayName.split(/\s+/)[0] || displayName;

  const stats = [
    {
      label: "کل سفارش‌ها",
      value: formatPersianNumber(orders.length),
      hint:
        activeOrders > 0
          ? `${formatPersianNumber(activeOrders)} در جریان`
          : "همه تکمیل یا خالی",
      href: hajiasalPath("/account/orders"),
    },
    {
      label: "آدرس‌های ذخیره‌شده",
      value: formatPersianNumber(addresses.length),
      hint: addresses.some((a) => a.isDefault)
        ? "آدرس پیش‌فرض فعال است"
        : "آدرس پیش‌فرض ندارید",
      href: hajiasalPath("/account/addresses"),
    },
    {
      label: "علاقه‌مندی‌ها",
      value: formatPersianNumber(wishlistIds.length),
      hint: "برای خرید سریع‌تر",
      href: hajiasalPath("/account/wishlist"),
    },
  ];

  return (
    <div>
      <AccountPageHeader
        title={`سلام، ${firstName}`}
        subtitle="سفارش‌ها، آدرس‌ها و پشتیبانی را از یکجا مدیریت کنید."
        action={
          <Button href={hajiasalPath("/shop")} size="sm" className="w-full sm:w-auto">
            ادامه خرید
            <ArrowLeft size={15} />
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((stat, index) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={cn(
              "account-surface group rounded-2xl border border-border bg-surface p-4 transition-[border-color,transform] duration-200",
              "hover:border-gold/35 active:scale-[0.99]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-void",
              index === 0 && "sm:col-span-1",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-secondary">{stat.label}</p>
              <CaretLeft
                size={14}
                className="mt-0.5 text-dim opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
              />
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-primary">
              {stat.value}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-dim">
              {stat.hint}
            </p>
          </Link>
        ))}
      </div>

      {lastOrder ? (
        <AccountSurface as="section" padded={false} className="mb-6">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-elevated/40 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-primary">آخرین سفارش</h2>
            <OrderStatusBadge status={lastOrder.status} />
          </div>
          <div className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  className="font-mono text-sm font-medium text-primary"
                  dir="ltr"
                >
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

            {lastOrder.items.length > 0 ? (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex -space-x-2 space-x-reverse">
                  {lastOrder.items.slice(0, 4).map((item) => (
                    <div
                      key={`${item.productId}-${item.weight.grams}`}
                      className="relative h-10 w-10 overflow-hidden rounded-xl border-2 border-surface bg-surface-muted ring-1 ring-border"
                    >
                      <ProductImage
                        src={item.image}
                        alt={item.title}
                        fill
                        sizes="40px"
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
        </AccountSurface>
      ) : (
        <AccountSurface
          as="section"
          className="mb-6 border-dashed border-border-bright px-5 py-10 text-center"
        >
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-dim text-gold">
            <Package size={22} weight="duotone" />
          </div>
          <p className="text-sm font-medium text-primary">
            هنوز سفارشی ثبت نکرده‌اید
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-secondary">
            عسل‌های اصل حاجی‌عسل را از فروشگاه انتخاب کنید؛ وضعیت سفارش همین‌جا
            نمایش داده می‌شود.
          </p>
          <div className="mt-5">
            <Button href={hajiasalPath("/shop")}>رفتن به فروشگاه</Button>
          </div>
        </AccountSurface>
      )}

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-primary">دسترسی سریع</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "account-surface group rounded-2xl border border-border bg-surface p-4",
                "transition-[border-color,background-color,transform] duration-200",
                "hover:border-gold/35 hover:bg-gold/[0.04] active:scale-[0.98]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-void",
              )}
            >
              <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gold-dim text-gold transition-transform duration-200 group-hover:scale-105">
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
          className="account-surface flex gap-3 rounded-2xl border border-border bg-surface p-4 transition-[border-color] duration-200 hover:border-gold/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-void"
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
          className="account-surface flex gap-3 rounded-2xl border border-border bg-surface p-4 transition-[border-color] duration-200 hover:border-gold/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-void"
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
    </div>
  );
}
