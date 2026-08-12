"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "@phosphor-icons/react";
import {
  checkoutSchema,
  type CheckoutSchemaType,
} from "@/lib/validations/checkout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CartSummary } from "@/components/cart/CartSummary";
import { CartItemRow } from "@/components/cart/CartItem";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { PaymentMethodSelector } from "@/components/checkout/PaymentMethodSelector";
import type { PaymentMethod } from "@/components/checkout/PaymentMethodSelector";
import {
  ShippingMethodSelector,
  type ShippingMethod,
  type ShippingOption,
} from "@/components/checkout/ShippingMethodSelector";
import { useCartStore } from "@/store/cart";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { hajiasalPath } from "@/lib/paths";
import { SNAPPPAY_FEE_PERCENT } from "@/lib/snappay-constants";

const steps = [
  { id: 1, title: "اطلاعات تماس" },
  { id: 2, title: "آدرس ارسال" },
  { id: 3, title: "بررسی و پرداخت" },
];

function cartFingerprint(
  items: Array<{ productId: string; weight: { grams: number }; quantity: number }>,
): string {
  return items
    .map((i) => `${i.productId}:${i.weight.grams}:${i.quantity}`)
    .sort()
    .join("|");
}

function CheckoutPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoggedIn, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [snappayAccepted, setSnappayAccepted] = useState(false);
  const [shippingMethod, setShippingMethod] =
    useState<ShippingMethod>("standard");
  const [prefilled, setPrefilled] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [pendingPaymentMethod, setPendingPaymentMethod] =
    useState<PaymentMethod | null>(null);
  const couponAutoTried = useRef(false);

  const items = useCartStore((s) => s.items);
  const hasHydrated = useCartStore((s) => s._hasHydrated);
  const subtotal = useCartStore((s) => s.getSubtotal());
  const baseShippingCost = useCartStore((s) => s.shippingConfig.shippingCost);
  const appliedCouponCode = useCartStore((s) => s.appliedCouponCode);
  const setAppliedCouponCode = useCartStore((s) => s.setAppliedCouponCode);

  const itemsKey = useMemo(() => cartFingerprint(items), [items]);

  const couponFromQuery = searchParams.get("coupon")?.trim() ?? "";
  const checkoutRedirectPath = couponFromQuery
    ? `${hajiasalPath("/checkout")}?coupon=${encodeURIComponent(couponFromQuery)}`
    : hajiasalPath("/checkout");
  const loginHref = `${hajiasalPath("/login")}?redirect=${encodeURIComponent(checkoutRedirectPath)}`;
  const completeHref = `${hajiasalPath("/login")}?step=complete&redirect=${encodeURIComponent(checkoutRedirectPath)}`;

  useEffect(() => {
    const payment = searchParams.get("payment");
    const orderId =
      searchParams.get("orderId") ?? searchParams.get("order");
    if (payment === "failed") {
      setError(
        orderId
          ? `پرداخت سفارش ${orderId} ناموفق بود. می‌توانید همان سفارش را ادامه دهید یا سفارش جدید بسازید.`
          : "پرداخت ناموفق بود. لطفاً دوباره تلاش کنید یا روش دیگری انتخاب کنید.",
      );
      if (orderId) setPendingOrderId(orderId);
    } else if (payment === "cancelled") {
      setError(
        orderId
          ? `پرداخت سفارش ${orderId} لغو شد. سبد شما محفوظ است؛ می‌توانید ادامه پرداخت دهید.`
          : "پرداخت لغو شد. سبد شما محفوظ است.",
      );
      if (orderId) setPendingOrderId(orderId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!pendingOrderId) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/orders?id=${encodeURIComponent(pendingOrderId)}`,
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          order?: { paymentMethod?: PaymentMethod; status?: string };
        };
        const method = data.order?.paymentMethod;
        if (method === "online" || method === "snappay") {
          setPendingPaymentMethod(method);
          setPaymentMethod((prev) => prev ?? method);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pendingOrderId]);

  useEffect(() => {
    const seed =
      couponFromQuery || appliedCouponCode?.trim() || "";
    if (!seed) return;
    const normalized = seed.toUpperCase();
    setCouponCode((prev) => (prev.trim() ? prev : normalized));
  }, [couponFromQuery, appliedCouponCode]);

  const shippingOptions: ShippingOption[] = useMemo(
    () => [
      {
        id: "standard",
        label: "ارسال عادی",
        description: "پست پیشتاز با بسته‌بندی ضدضربه",
        cost: baseShippingCost,
        eta: "یزد ۱ تا ۲ روز · سایر شهرها ۳ تا ۷ روز کاری",
      },
      {
        id: "express",
        label: "ارسال سریع",
        description: "پیک یا تیپاکس در مراکز استان",
        cost: baseShippingCost + 35000,
        eta: "۱ تا ۲ روز کاری",
      },
      {
        id: "pickup",
        label: "تحویل حضوری",
        description: "مراجعه به آدرس فروشگاه پس از هماهنگی",
        cost: 0,
        eta: "هماهنگی تلفنی",
      },
    ],
    [baseShippingCost],
  );

  const shipping =
    shippingOptions.find((o) => o.id === shippingMethod)?.cost ??
    baseShippingCost;
  const cashTotal = Math.max(0, subtotal + shipping - discount);
  const payableTotal =
    paymentMethod === "snappay"
      ? Math.round(cashTotal * (1 + SNAPPPAY_FEE_PERCENT / 100))
      : cashTotal;
  const snappayFee =
    paymentMethod === "snappay" ? Math.max(0, payableTotal - cashTotal) : 0;

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<CheckoutSchemaType>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      province: "",
      city: "",
      address: "",
      postalCode: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      router.replace(loginHref);
      return;
    }
    if (!user?.fullName?.trim()) {
      router.replace(completeHref);
    }
  }, [authLoading, isLoggedIn, user, router, loginHref, completeHref]);

  useEffect(() => {
    if (authLoading || prefilled || !user) return;

    if (user.fullName) setValue("fullName", user.fullName);
    if (user.phone) setValue("phone", user.phone);

    void (async () => {
      try {
        const res = await fetch("/api/account/addresses");
        if (!res.ok) return;
        const data = await res.json();
        const list = (data.addresses ?? []) as Array<{
          isDefault?: boolean;
          province?: string;
          city?: string;
          address?: string;
          postalCode?: string;
        }>;
        const preferred =
          list.find((a) => a.isDefault) ?? list[0] ?? null;
        if (!preferred) return;
        if (preferred.province) setValue("province", preferred.province);
        if (preferred.city) setValue("city", preferred.city);
        if (preferred.address) setValue("address", preferred.address);
        if (preferred.postalCode) setValue("postalCode", preferred.postalCode);
      } catch {
        /* ignore */
      } finally {
        setPrefilled(true);
      }
    })();
  }, [authLoading, user, prefilled, setValue]);

  const validateCoupon = useCallback(
    async (code: string, opts?: { persist?: boolean }) => {
      const normalized = code.trim().toUpperCase();
      if (!normalized) return;
      setCouponBusy(true);
      try {
        const res = await fetch("/api/coupons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: normalized,
            subtotal,
            lineItems: items.map((i) => ({
              productId: i.productId,
              lineTotal: i.weight.price * i.quantity,
            })),
          }),
        });
        const data = (await res.json()) as {
          valid?: boolean;
          discount?: number;
          message?: string;
        };
        if (data.valid) {
          setDiscount(data.discount ?? 0);
          setCouponMessage(data.message ?? "کد تخفیف اعمال شد");
          setCouponCode(normalized);
          if (opts?.persist !== false) {
            setAppliedCouponCode(normalized);
          }
        } else {
          setDiscount(0);
          setCouponMessage(data.message ?? "کد تخفیف معتبر نیست");
          if (opts?.persist !== false) {
            setAppliedCouponCode(null);
          }
        }
      } catch {
        setCouponMessage("خطا در بررسی کد تخفیف");
      } finally {
        setCouponBusy(false);
      }
    },
    [items, subtotal, setAppliedCouponCode],
  );

  useEffect(() => {
    if (!hasHydrated || items.length === 0) return;
    const seed =
      couponFromQuery || appliedCouponCode?.trim() || couponCode.trim();
    if (!seed) return;
    if (couponAutoTried.current && !couponFromQuery && !appliedCouponCode) {
      return;
    }
    couponAutoTried.current = true;
    void validateCoupon(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once after hydrate
  }, [hasHydrated, items.length]);

  useEffect(() => {
    if (!hasHydrated) return;
    const code = couponCode.trim() || appliedCouponCode?.trim() || "";
    if (!code || discount <= 0) return;
    void validateCoupon(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revalidate on cart composition
  }, [itemsKey, subtotal]);

  if (authLoading || !isLoggedIn || !user?.fullName?.trim()) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-secondary">
          {!isLoggedIn || authLoading
            ? "در حال انتقال به صفحه ورود..."
            : "در حال تکمیل ثبت‌نام..."}
        </p>
      </div>
    );
  }

  if (!hasHydrated) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-14">
        <SectionHeading title="تکمیل خرید" className="mb-6 md:mb-8" />
        <div
          className="space-y-3"
          aria-busy="true"
          aria-label="در حال بارگذاری سبد"
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-2xl bg-surface-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-10 sm:py-16">
        <EmptyState
          className="my-auto"
          title="سبد خرید خالی است"
          description="برای ادامه سفارش، ابتدا محصولی به سبد اضافه کنید."
          action={<Button href={hajiasalPath("/shop")}>رفتن به فروشگاه</Button>}
        />
      </div>
    );
  }

  const nextStep = async () => {
    if (step === 1) {
      const valid = await trigger(["fullName", "phone"]);
      if (valid) setStep(2);
    } else if (step === 2) {
      const valid = await trigger([
        "province",
        "city",
        "address",
        "postalCode",
      ]);
      if (valid) setStep(3);
    }
  };

  const applyCoupon = () => {
    void validateCoupon(couponCode);
  };

  const clearCoupon = () => {
    setCouponCode("");
    setDiscount(0);
    setCouponMessage("");
    setAppliedCouponCode(null);
    couponAutoTried.current = false;
  };

  const startGateway = async (
    orderId: string,
    method: PaymentMethod,
  ): Promise<void> => {
    const endpoint =
      method === "snappay"
        ? "/api/checkout/snappay/create"
        : "/api/checkout/create";
    const payRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const pay = (await payRes.json()) as {
      redirectUrl?: string;
      message?: string;
    };
    if (payRes.ok && pay.redirectUrl) {
      window.location.href = pay.redirectUrl;
      return;
    }
    setPendingOrderId(orderId);
    setPendingPaymentMethod(method);
    throw new Error(
      pay.message ||
        (method === "snappay"
          ? "انتقال به درگاه اسنپ‌پی ممکن نشد. روش دیگری انتخاب کنید."
          : "انتقال به درگاه پرداخت ممکن نشد. روش دیگری انتخاب کنید."),
    );
  };

  const resumeOnlinePayment = async () => {
    const method = pendingPaymentMethod ?? paymentMethod;
    if (!pendingOrderId || !method) {
      setError("روش پرداخت سفارش را انتخاب کنید تا ادامه پرداخت ممکن شود.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await startGateway(pendingOrderId, method);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = async (data: CheckoutSchemaType) => {
    if (!paymentMethod) {
      setError("لطفاً روش پرداخت خود را انتخاب کنید.");
      return;
    }
    if (paymentMethod === "snappay" && !snappayAccepted) {
      setError("برای خرید اقساطی باید قوانین اسنپ‌پی را بپذیرید.");
      return;
    }

    if (pendingOrderId) {
      const resumeMethod = pendingPaymentMethod ?? paymentMethod;
      if (pendingPaymentMethod && pendingPaymentMethod !== paymentMethod) {
        setError(
          "روش پرداخت با سفارش قبلی یکی نیست. «ادامه پرداخت همین سفارش» را بزنید یا «ساخت سفارش جدید» را انتخاب کنید.",
        );
        return;
      }
      if (resumeMethod) {
        await resumeOnlinePayment();
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: data,
          items,
          subtotal,
          shipping,
          total: cashTotal,
          couponCode: discount > 0 ? couponCode : undefined,
          paymentMethod,
          shippingMethod,
        }),
      });

      const result = (await res.json()) as {
        success?: boolean;
        message?: string;
        orderId?: string;
        trackingCode?: string;
      };

      if (!res.ok || !result.success) {
        throw new Error(result.message || "خطا در پردازش سفارش");
      }

      if (!result.orderId) {
        throw new Error("شناسه سفارش دریافت نشد. دوباره تلاش کنید.");
      }

      await startGateway(result.orderId, paymentMethod);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
    } finally {
      setIsSubmitting(false);
    }
  };

  const discardPendingAndPayFresh = () => {
    setPendingOrderId(null);
    setPendingPaymentMethod(null);
    setError(
      "سفارش قبلی کنار گذاشته شد. با زدن دکمه پرداخت، سفارش جدید ساخته می‌شود.",
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-14">
      <SectionHeading title="تکمیل خرید" className="mb-6 md:mb-8" />

      <p className="mb-5 text-xs text-dim md:mb-6">
        وارد شده‌اید
        {user?.fullName ? ` · ${user.fullName}` : ""} · اطلاعات از حساب پر
        می‌شود.
      </p>

      <div className="mb-6 md:mb-8">
        <ol className="flex items-stretch gap-2 sm:gap-3" aria-label="مراحل سفارش">
          {steps.map((s) => {
            const done = step > s.id;
            const current = step === s.id;
            return (
              <li
                key={s.id}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center gap-2 rounded-xl border px-2 py-3 sm:px-3",
                  current
                    ? "border-gold/50 bg-gold-dim"
                    : done
                      ? "border-border bg-surface"
                      : "border-border/60 bg-surface-elevated/50",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                    current || done
                      ? "bg-gold text-ink-on-gold"
                      : "bg-surface text-secondary",
                  )}
                >
                  {done ? (
                    <Check size={16} weight="bold" />
                  ) : (
                    s.id.toLocaleString("fa-IR")
                  )}
                </span>
                <span
                  className={cn(
                    "text-center text-[10px] leading-tight sm:text-xs",
                    current ? "font-medium text-primary" : "text-secondary",
                  )}
                >
                  {s.title}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-2xl border border-border bg-surface p-4 sm:p-5 md:p-8"
      >
        {step === 1 ? (
          <div className="flex flex-col gap-4">
            <Input
              label="نام و نام خانوادگی"
              {...register("fullName")}
              error={errors.fullName?.message}
            />
            <Input
              label="شماره موبایل"
              placeholder="09967891973"
              dir="ltr"
              {...register("phone")}
              error={errors.phone?.message}
              disabled
            />
            <p className="text-[11px] text-dim">
              موبایل حساب کاربری قابل تغییر در این مرحله نیست.
            </p>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="flex flex-col gap-4">
            <Input
              label="استان"
              {...register("province")}
              error={errors.province?.message}
            />
            <Input
              label="شهر"
              {...register("city")}
              error={errors.city?.message}
            />
            <Input
              label="آدرس کامل"
              {...register("address")}
              error={errors.address?.message}
            />
            <Input
              label="کد پستی"
              placeholder="1234567890"
              dir="ltr"
              {...register("postalCode")}
              error={errors.postalCode?.message}
            />
            <Input
              label="یادداشت (اختیاری)"
              {...register("notes")}
              error={errors.notes?.message}
            />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="flex flex-col gap-6">
            <div className="rounded-xl bg-surface-elevated p-4 text-sm">
              <p>
                <span className="text-secondary">نام: </span>
                {getValues("fullName")}
              </p>
              <p>
                <span className="text-secondary">موبایل: </span>
                <span dir="ltr">{getValues("phone")}</span>
              </p>
              <p>
                <span className="text-secondary">آدرس: </span>
                {getValues("province")}، {getValues("city")}،{" "}
                {getValues("address")}
              </p>
            </div>

            <ShippingMethodSelector
              options={shippingOptions}
              value={shippingMethod}
              onChange={setShippingMethod}
            />

            <PaymentMethodSelector
              value={paymentMethod}
              onChange={(method) => {
                setPaymentMethod(method);
                if (method !== "snappay") setSnappayAccepted(false);
              }}
              cashTotal={cashTotal}
              snappayAccepted={snappayAccepted}
              onSnappayAcceptedChange={setSnappayAccepted}
            />

            <CartItemRow />
            <div className="flex gap-2">
              <Input
                placeholder="کد تخفیف"
                dir="ltr"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                disabled={couponBusy || !couponCode.trim()}
                onClick={applyCoupon}
              >
                {couponBusy ? "..." : "اعمال"}
              </Button>
              {discount > 0 || couponCode.trim() ? (
                <Button type="button" variant="ghost" onClick={clearCoupon}>
                  حذف
                </Button>
              ) : null}
            </div>
            {couponMessage ? (
              <p
                className={`text-xs ${discount > 0 ? "text-gold" : "text-secondary"}`}
              >
                {couponMessage}
              </p>
            ) : null}
            <CartSummary
              shippingOverride={shipping}
              discount={discount}
              feeLabel={
                snappayFee > 0
                  ? `کارمزد اسنپ‌پی (${SNAPPPAY_FEE_PERCENT}٪)`
                  : undefined
              }
              feeAmount={snappayFee > 0 ? snappayFee : undefined}
              payableOverride={
                paymentMethod === "snappay" ? payableTotal : undefined
              }
            />
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            {pendingOrderId ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
                <p className="font-medium text-primary">
                  سفارش پرداخت‌نشده:{" "}
                  <span className="font-mono" dir="ltr">
                    {pendingOrderId}
                  </span>
                </p>
                <p className="mt-1 text-xs text-secondary">
                  دکمه اصلی همان سفارش را ادامه می‌دهد. اگر سبد را عوض کرده‌اید،
                  «سفارش جدید» بزنید.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    disabled={
                      isSubmitting ||
                      !(pendingPaymentMethod ?? paymentMethod) ||
                      ((pendingPaymentMethod ?? paymentMethod) === "snappay" &&
                        !snappayAccepted)
                    }
                    onClick={() => void resumeOnlinePayment()}
                    className="flex-1"
                  >
                    ادامه پرداخت همین سفارش
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={discardPendingAndPayFresh}
                    className="flex-1"
                  >
                    ساخت سفارش جدید
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 flex gap-3">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(step - 1)}
            >
              قبلی
            </Button>
          ) : null}
          {step < 3 ? (
            <Button type="button" onClick={nextStep} className="flex-1">
              بعدی
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !paymentMethod ||
                (paymentMethod === "snappay" && !snappayAccepted)
              }
              className="flex-1"
            >
              {isSubmitting
                ? "در حال پردازش..."
                : pendingOrderId
                  ? "ادامه پرداخت سفارش قبلی"
                  : paymentMethod === "snappay"
                    ? "پرداخت اقساطی اسنپ‌پی"
                    : paymentMethod === "online"
                      ? "پرداخت آنلاین"
                      : "انتخاب روش پرداخت"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-secondary">
          در حال بارگذاری...
        </div>
      }
    >
      <CheckoutPageInner />
    </Suspense>
  );
}
