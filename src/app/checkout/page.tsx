"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "motion/react";
import {
  checkoutSchema,
  type CheckoutSchemaType,
} from "@/lib/validations/checkout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PaymentMethod } from "@/components/checkout/PaymentMethodSelector";
import {
  ShippingMethodSelector,
  type ShippingMethod,
  type ShippingOption,
  type ShippingMethodSelectorHandle,
} from "@/components/checkout/ShippingMethodSelector";
import { CheckoutAuthSheet } from "@/components/checkout/CheckoutAuthSheet";
import { AddressCardList } from "@/components/checkout/AddressCardList";
import { AddressMapSheet } from "@/components/checkout/AddressMapSheet";
import { CheckoutStickyFooter } from "@/components/checkout/CheckoutStickyFooter";
import { PaymentHandoffOverlay } from "@/components/checkout/PaymentHandoffOverlay";
import { PaymentResultView } from "@/components/checkout/PaymentResultView";
import { CouponTrap } from "@/components/checkout/CouponTrap";
import { PickupLocationCard } from "@/components/checkout/PickupLocationCard";
import { useCartStore } from "@/store/cart";
import { useCheckoutStore } from "@/store/checkout";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { hajiasalPath } from "@/lib/paths";
import { SNAPPPAY_FEE_PERCENT } from "@/lib/snappay-constants";
import type { UserAddress } from "@/types/auth";
import {
  resolveShippingMethodCopy,
  shippingCostForMethod,
  type ShippingMethodId,
} from "@/lib/shipping";

const PENDING_ORDER_STORAGE_KEY = "hajiasal-pending-checkout-order";
const CHECKOUT_STAGE =
  "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain";

function cartFingerprint(
  items: Array<{ productId: string; weight: { grams: number }; quantity: number }>,
): string {
  return items
    .map((i) => `${i.productId}:${i.weight.grams}:${i.quantity}`)
    .sort()
    .join("|");
}

function triggerErrorHaptic() {
  try {
    navigator.vibrate?.([35, 55, 35]);
  } catch {
    /* ignore */
  }
}

function CheckoutPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoggedIn, loading: authLoading } = useAuth();
  const shippingRef = useRef<ShippingMethodSelectorHandle>(null);
  const addressBlockRef = useRef<HTMLDivElement>(null);
  const payShakeRef = useRef(0);
  const [payShakeKey, setPayShakeKey] = useState(0);

  const shippingMethod = useCheckoutStore((s) => s.shippingMethod);
  const setShippingMethod = useCheckoutStore((s) => s.setShippingMethod);
  const setAddressSnapshot = useCheckoutStore((s) => s.setAddress);
  const isProcessing = useCheckoutStore((s) => s.isProcessing);
  const setIsProcessing = useCheckoutStore((s) => s.setIsProcessing);

  // Handoff lock must never stick across remounts / bfcache back from gateway.
  useEffect(() => {
    const clearHandoff = () => {
      setIsProcessing(false);
      payInFlight.current = false;
    };
    clearHandoff();

    const onPageShow = () => {
      // Any return to this document must drop the shield (not only bfcache).
      clearHandoff();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => {
      clearHandoff();
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [setIsProcessing]);

  const [error, setError] = useState<string | null>(null);

  // Gateway cancel/fail/resume callback lands on /checkout?payment=… — always drop the shield.
  useEffect(() => {
    const payment = searchParams.get("payment");
    if (
      payment === "failed" ||
      payment === "cancelled" ||
      payment === "resume"
    ) {
      setIsProcessing(false);
      payInFlight.current = false;
    }
  }, [searchParams, setIsProcessing]);

  // After cancel/fail return, first browser Back should leave checkout — not re-open gateway.
  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment !== "failed" && payment !== "cancelled") return;

    const onPop = () => {
      window.location.replace(hajiasalPath("/cart"));
    };
    try {
      window.history.pushState({ hajiasalCheckoutReturn: 1 }, "");
    } catch {
      return;
    }
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
    };
  }, [searchParams]);

  // Never leave the banking shield locked forever (hung create / blocked navigation).
  useEffect(() => {
    if (!isProcessing) return;
    const id = window.setTimeout(() => {
      setIsProcessing(false);
      payInFlight.current = false;
      setError("انتقال به درگاه طولانی شد. دوباره تلاش کنید.");
    }, 25_000);
    return () => window.clearTimeout(id);
  }, [isProcessing, setIsProcessing]);

  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("online");
  const [snappayAccepted, setSnappayAccepted] = useState(false);
  const [showSnappay, setShowSnappay] = useState(false);
  const [snappayAvailable, setSnappayAvailable] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [pendingPaymentMethod, setPendingPaymentMethod] =
    useState<PaymentMethod | null>(null);
  const [authSheetOpen, setAuthSheetOpen] = useState(false);
  const [mapSheetOpen, setMapSheetOpen] = useState(false);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [addressShakeKey, setAddressShakeKey] = useState(0);
  const couponAutoTried = useRef(false);
  const couponClearedByUser = useRef(false);
  const payInFlight = useRef(false);
  const autoResumeTried = useRef(false);

  const items = useCartStore((s) => s.items);
  const hasHydrated = useCartStore((s) => s._hasHydrated);
  const subtotal = useCartStore((s) => s.getPayableSubtotal());
  const applyRevalidate = useCartStore((s) => s.applyRevalidate);
  const siteSettings = useSiteSettings();
  const appliedCouponCode = useCartStore((s) => s.appliedCouponCode);
  const setAppliedCouponCode = useCartStore((s) => s.setAppliedCouponCode);

  const itemsKey = useMemo(() => cartFingerprint(items), [items]);
  const couponFromQuery = searchParams.get("coupon")?.trim() ?? "";
  const warehouseAddress =
    siteSettings.footer?.address?.trim() || "یزد، انبار مرکزی حاجی عسل";
  const warehousePhone = siteSettings.footer?.phone?.trim() || "";

  const clearCoupon = useCallback(() => {
    couponClearedByUser.current = true;
    couponAutoTried.current = true;
    setCouponCode("");
    setDiscount(0);
    setCouponMessage("");
    setAppliedCouponCode(null);
    if (searchParams.get("coupon")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("coupon");
      const qs = params.toString();
      router.replace(qs ? `/checkout?${qs}` : "/checkout", { scroll: false });
    }
  }, [setAppliedCouponCode, searchParams, router]);

  useEffect(() => {
    if (couponClearedByUser.current) return;
    const seed = couponFromQuery || appliedCouponCode?.trim() || "";
    if (!seed) return;
    const normalized = seed.toUpperCase();
    setCouponCode((prev) => (prev.trim() ? prev : normalized));
  }, [couponFromQuery, appliedCouponCode]);

  useEffect(() => {
    void fetch("/api/checkout/availability")
      .then((r) => r.json())
      .then((d) => {
        setSnappayAvailable(Boolean(d.snappay));
        if (!d.zibal && d.snappay) {
          setPaymentMethod("snappay");
          setShowSnappay(true);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!hasHydrated || items.length === 0) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/cart/revalidate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map((i) => ({
              productId: i.productId,
              weightGrams: i.weight.grams,
              quantity: i.quantity,
              currentPrice: i.priceAtAdd ?? i.weight.price,
            })),
          }),
        });
        const data = (await res.json()) as {
          success?: boolean;
          items?: Array<{
            productId: string;
            weightGrams: number;
            availability: "ok" | "price_changed" | "out_of_stock";
            inStock: boolean;
            stockQty?: number;
            livePrice: number;
            title?: string;
            image?: string;
            sellerId?: string;
          }>;
        };
        if (!cancelled && res.ok && data.success && data.items) {
          applyRevalidate(data.items);
        }
      } catch {
        /* keep local cart */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once after hydrate / cart shape
  }, [hasHydrated, itemsKey, applyRevalidate]);

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
    } else if (payment === "resume") {
      setError(null);
      if (orderId) setPendingOrderId(orderId);
    } else if (!payment) {
      try {
        const raw = sessionStorage.getItem(PENDING_ORDER_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as {
            orderId?: string;
            method?: PaymentMethod;
          };
          if (parsed.orderId) {
            setPendingOrderId(parsed.orderId);
            if (parsed.method === "online" || parsed.method === "snappay") {
              setPendingPaymentMethod(parsed.method);
              setPaymentMethod(parsed.method);
            }
          }
        }
      } catch {
        /* ignore */
      }
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
          setPaymentMethod(method);
          if (method === "snappay") setShowSnappay(true);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pendingOrderId]);

  const shippingOptions: ShippingOption[] = useMemo(() => {
    const ids: ShippingMethodId[] = ["standard", "express", "pickup"];
    return ids.map((id) => {
      const copy = resolveShippingMethodCopy(id, siteSettings.shippingMethods);
      return {
        id,
        label: copy.label,
        description: copy.description,
        cost: shippingCostForMethod(id, subtotal, siteSettings),
        eta: copy.eta,
        recommended: id === "express",
      };
    });
  }, [siteSettings, subtotal]);

  const shipping =
    shippingOptions.find((o) => o.id === shippingMethod)?.cost ?? 0;
  const payableItemCount = items.filter(
    (i) => i.availability !== "out_of_stock" && i.inStock !== false,
  ).length;
  const cashTotal =
    payableItemCount > 0 ? Math.max(0, subtotal + shipping - discount) : 0;
  const payableTotal =
    paymentMethod === "snappay"
      ? Math.round(cashTotal * (1 + SNAPPPAY_FEE_PERCENT / 100))
      : cashTotal;

  const {
    register,
    handleSubmit,
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
      setAuthSheetOpen(true);
      return;
    }
    setAuthSheetOpen(false);
    if (user?.fullName) setValue("fullName", user.fullName);
    if (user?.phone) setValue("phone", user.phone);
  }, [authLoading, isLoggedIn, user, setValue]);

  const applyAddressToForm = useCallback(
    (addr: UserAddress) => {
      setSelectedAddressId(addr.id);
      setAddressSnapshot({
        id: addr.id,
        province: addr.province,
        city: addr.city,
        address: addr.address,
        postalCode: addr.postalCode,
        receiverName: addr.receiverName,
        receiverPhone: addr.receiverPhone,
      });
      setValue("province", addr.province);
      setValue("city", addr.city);
      setValue("address", addr.address);
      setValue(
        "postalCode",
        addr.postalCode?.length === 10 && addr.postalCode !== "0000000000"
          ? addr.postalCode
          : "",
      );
      if (addr.receiverName) setValue("fullName", addr.receiverName);
      // Billing phone stays on session; delivery contact goes to order notes via API.
    },
    [setAddressSnapshot, setValue],
  );

  const loadAddresses = useCallback(async (opts?: { preserveSelection?: boolean }) => {
    if (!isLoggedIn) return;
    setAddressesLoading(true);
    try {
      const res = await fetch("/api/account/addresses");
      if (!res.ok) {
        setError("بارگذاری آدرس‌ها ناموفق بود. دوباره تلاش کنید.");
        return;
      }
      const data = await res.json();
      const list = (data.addresses ?? []) as UserAddress[];
      setAddresses(list);
      if (opts?.preserveSelection) {
        setPrefilled(true);
        return;
      }
      const preferred = list.find((a) => a.isDefault) ?? list[0] ?? null;
      if (preferred) applyAddressToForm(preferred);
      setPrefilled(true);
    } catch {
      setError("ارتباط برای بارگذاری آدرس‌ها برقرار نشد.");
    } finally {
      setAddressesLoading(false);
    }
  }, [isLoggedIn, applyAddressToForm]);

  useEffect(() => {
    if (authLoading || !isLoggedIn || prefilled) return;
    void loadAddresses();
  }, [authLoading, isLoggedIn, prefilled, loadAddresses]);

  useEffect(() => {
    const key = "hajiasal-checkout-notes";
    try {
      const saved = localStorage.getItem(key);
      if (saved) setValue("notes", saved);
    } catch {
      /* private mode */
    }
  }, [setValue]);

  useEffect(() => {
    const sub = setInterval(() => {
      try {
        const notes = getValues("notes") ?? "";
        localStorage.setItem("hajiasal-checkout-notes", notes);
      } catch {
        /* private mode */
      }
    }, 800);
    return () => clearInterval(sub);
  }, [getValues]);

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
        setDiscount(0);
        setCouponMessage("خطا در بررسی کد تخفیف");
      } finally {
        setCouponBusy(false);
      }
    },
    [items, subtotal, setAppliedCouponCode],
  );

  useEffect(() => {
    if (!hasHydrated || items.length === 0) return;
    if (couponClearedByUser.current) return;
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
    if (couponClearedByUser.current) return;
    const code = couponCode.trim() || appliedCouponCode?.trim() || "";
    if (!code || discount <= 0) return;
    void validateCoupon(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revalidate on cart composition
  }, [itemsKey, subtotal]);

  const failValidation = (target: "shipping" | "address" | "snappay") => {
    triggerErrorHaptic();
    payShakeRef.current += 1;
    setPayShakeKey(payShakeRef.current);
    if (target === "shipping") {
      shippingRef.current?.shake();
      shippingRef.current?.scrollIntoView();
      setError("لطفاً روش ارسال را انتخاب کنید.");
      return;
    }
    if (target === "address") {
      setAddressShakeKey((k) => k + 1);
      addressBlockRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      setError(
        shippingMethod === "pickup"
          ? "اطلاعات تماس برای تحویل حضوری ناقص است. دوباره وارد شوید یا پشتیبانی را خبر کنید."
          : "لطفاً یک آدرس انتخاب کنید یا آدرس جدید اضافه کنید.",
      );
      return;
    }
    setError("برای خرید اقساطی باید قوانین اسنپ‌پی را بپذیرید.");
  };

  const applyPickupContactAddress = () => {
    // Pickup does not need a delivery pin; warehouse + session contact is enough.
    setValue("province", "یزد");
    setValue("city", "یزد");
    setValue(
      "address",
      warehouseAddress.length >= 10
        ? warehouseAddress
        : "یزد، امامشهر، بلوار کارگر، خیابان سجاد شمالی، کوچه ۱۵",
    );
    setValue("postalCode", "8913183478");
    if (!getValues("fullName")?.trim()) {
      setValue("fullName", user?.fullName?.trim() || "خریدار حاجی‌عسل");
    }
    if (user?.phone) setValue("phone", user.phone);
  };

  const persistPendingOrder = (orderId: string, method: PaymentMethod) => {
    setPendingOrderId(orderId);
    setPendingPaymentMethod(method);
    try {
      sessionStorage.setItem(
        PENDING_ORDER_STORAGE_KEY,
        JSON.stringify({ orderId, method }),
      );
    } catch {
      /* ignore */
    }
  };

  const startGateway = async (
    orderId: string,
    method: PaymentMethod,
  ): Promise<void> => {
    persistPendingOrder(orderId, method);
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
      // replace (not assign): browser Back leaves the gateway instead of looping
      // checkout → gateway → checkout → gateway.
      window.location.replace(pay.redirectUrl);
      return;
    }
    throw new Error(
      pay.message ||
        (method === "snappay"
          ? "انتقال به درگاه اسنپ‌پی ممکن نشد. روش دیگری انتخاب کنید."
          : "انتقال به درگاه پرداخت ممکن نشد. روش دیگری انتخاب کنید."),
    );
  };

  const resumeOnlinePayment = async () => {
    if (isProcessing || payInFlight.current) return;
    if (!pendingOrderId) {
      setError("سفارش در انتظار پرداخت یافت نشد.");
      return;
    }
    payInFlight.current = true;
    let method = pendingPaymentMethod;
    if (!method) {
      try {
        const res = await fetch(
          `/api/orders?id=${encodeURIComponent(pendingOrderId)}`,
        );
        if (res.ok) {
          const data = (await res.json()) as {
            order?: { paymentMethod?: PaymentMethod };
          };
          const resolved = data.order?.paymentMethod;
          if (resolved === "online" || resolved === "snappay") {
            method = resolved;
            setPendingPaymentMethod(resolved);
            setPaymentMethod(resolved);
          }
        }
      } catch {
        /* ignore */
      }
    }
    method = method ?? paymentMethod;
    if (!method) {
      setError("روش پرداخت سفارش را انتخاب کنید تا ادامه پرداخت ممکن شود.");
      payInFlight.current = false;
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      await startGateway(pendingOrderId, method);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
      setIsProcessing(false);
      payInFlight.current = false;
    }
  };

  // From account "ادامه پرداخت": jump straight into gateway once order is loaded.
  useEffect(() => {
    if (searchParams.get("payment") !== "resume") return;
    if (!pendingOrderId || autoResumeTried.current || payInFlight.current) {
      return;
    }
    autoResumeTried.current = true;
    void resumeOnlinePayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per resume landing
  }, [pendingOrderId, searchParams]);

  const onSubmit = async (data: CheckoutSchemaType) => {
    if (!shippingMethod) {
      failValidation("shipping");
      payInFlight.current = false;
      setIsProcessing(false);
      return;
    }
    if (!selectedAddressId && shippingMethod !== "pickup") {
      failValidation("address");
      payInFlight.current = false;
      setIsProcessing(false);
      return;
    }
    if (paymentMethod === "snappay" && !snappayAccepted) {
      failValidation("snappay");
      payInFlight.current = false;
      setIsProcessing(false);
      return;
    }

    if (pendingOrderId) {
      // Never silently resume an old order from the main CTA — that re-applies
      // the previous coupon/total even after the user cleared the field.
      setError(
        "یک سفارش ناتمام دارید. برای همان مبلغ «ادامه پرداخت همین سفارش» را بزنید؛ برای تغییر کوپن یا آدرس، اول «ساخت سفارش جدید» را انتخاب کنید.",
      );
      payInFlight.current = false;
      setIsProcessing(false);
      try {
        document
          .getElementById("checkout-pending-order")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch {
        /* ignore */
      }
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const purchasableItems = items.filter(
        (i) => i.availability !== "out_of_stock" && i.inStock !== false,
      );
      if (purchasableItems.length === 0) {
        throw new Error("همه اقلام سبد ناموجود هستند. سبد را بررسی کنید.");
      }
      if (purchasableItems.length < items.length) {
        throw new Error(
          "برخی اقلام سبد ناموجود شده‌اند. سبد را بررسی کنید و دوباره تلاش کنید.",
        );
      }

      // Zero Trust: send address_id + shipping_method (+ cart ids).
      // Backend rebuilds prices from MySQL and calcShippingCost.
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: data,
          addressId: selectedAddressId,
          items: purchasableItems,
          // Display-only estimates; server recalculates authoritative totals.
          subtotal,
          shipping,
          total: cashTotal,
          couponCode:
            discount > 0 && couponCode.trim()
              ? couponCode.trim()
              : undefined,
          paymentMethod,
          shippingMethod,
        }),
      });

      const result = (await res.json()) as {
        success?: boolean;
        message?: string;
        orderId?: string;
        trackingCode?: string;
        free?: boolean;
        redirectUrl?: string;
        total?: number;
      };

      if (!res.ok || !result.success) {
        throw new Error(result.message || "خطا در پردازش سفارش");
      }

      if (!result.orderId) {
        throw new Error("شناسه سفارش دریافت نشد. دوباره تلاش کنید.");
      }

      if (result.free && result.redirectUrl) {
        try {
          sessionStorage.removeItem(PENDING_ORDER_STORAGE_KEY);
        } catch {
          /* ignore */
        }
        setPendingOrderId(null);
        setPendingPaymentMethod(null);
        window.location.href = result.redirectUrl;
        return;
      }

      await startGateway(result.orderId, paymentMethod);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
      setIsProcessing(false);
      payInFlight.current = false;
    }
  };

  const handlePayClick = () => {
    if (isProcessing || payInFlight.current) return;
    payInFlight.current = true;

    // Resume is only via the dedicated button — never hijack the sticky CTA.
    if (pendingOrderId) {
      setError(
        "یک سفارش ناتمام دارید. «ادامه پرداخت همین سفارش» یا «ساخت سفارش جدید» را بزنید.",
      );
      payInFlight.current = false;
      try {
        document
          .getElementById("checkout-pending-order")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch {
        /* ignore */
      }
      return;
    }
    if (!shippingMethod) {
      failValidation("shipping");
      payInFlight.current = false;
      return;
    }
    if (!selectedAddressId) {
      if (shippingMethod === "pickup") {
        applyPickupContactAddress();
      } else {
        failValidation("address");
        payInFlight.current = false;
        return;
      }
    }
    // Pickup still needs contact fields on the order record.
    const name = getValues("fullName")?.trim();
    if (!name) {
      setValue("fullName", user?.fullName?.trim() || "خریدار حاجی‌عسل");
    }
    // Ensure phone stays on the authenticated session number.
    if (user?.phone) setValue("phone", user.phone);
    setIsProcessing(true);
    void handleSubmit(onSubmit, (formErrors) => {
      payInFlight.current = false;
      setIsProcessing(false);
      triggerErrorHaptic();
      payShakeRef.current += 1;
      setPayShakeKey(payShakeRef.current);
      const first = Object.values(formErrors)[0];
      const msg =
        first && typeof first === "object" && first && "message" in first
          ? String(first.message)
          : "لطفاً اطلاعات تماس و آدرس را کامل کنید.";
      setError(msg);
      addressBlockRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    })();
  };

  const discardPendingAndPayFresh = () => {
    setPendingOrderId(null);
    setPendingPaymentMethod(null);
    payInFlight.current = false;
    try {
      sessionStorage.removeItem(PENDING_ORDER_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setError(
      "سفارش قبلی کنار گذاشته شد. با زدن دکمه پرداخت، سفارش جدید ساخته می‌شود.",
    );
  };

  const paymentOutcome = searchParams.get("payment");
  if (
    paymentOutcome === "failed" ||
    paymentOutcome === "cancelled" ||
    paymentOutcome === "pending"
  ) {
    const resultOrderId =
      searchParams.get("orderId") ?? searchParams.get("order") ?? undefined;
    return (
      <PaymentResultView
        kind={paymentOutcome}
        orderId={resultOrderId}
      />
    );
  }

  if (authLoading) {
    return (
      <div className={`${CHECKOUT_STAGE} mx-auto max-w-lg px-4 py-20 text-center`}>
        <p className="text-secondary">در حال بررسی ورود...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className={`${CHECKOUT_STAGE} mx-auto max-w-lg px-4 py-16 text-center`}>
        <SectionHeading title="تکمیل خرید" className="mb-4" />
        <p className="mb-6 text-sm text-secondary">
          برای ادامه، با شماره موبایل وارد شوید. نام کامل را بعداً هم می‌توانید
          تکمیل کنید.
        </p>
        <Button type="button" onClick={() => setAuthSheetOpen(true)}>
          ورود با پیامک
        </Button>
        <CheckoutAuthSheet
          open={authSheetOpen}
          onClose={() => setAuthSheetOpen(false)}
          onAuthenticated={() => {
            setAuthSheetOpen(false);
            setPrefilled(false);
          }}
        />
      </div>
    );
  }

  if (!hasHydrated) {
    return (
      <div className={`${CHECKOUT_STAGE} mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-14`}>
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
    if (pendingOrderId) {
      return (
        <div className={`${CHECKOUT_STAGE} mx-auto w-full max-w-lg gap-4 px-4 py-10 sm:py-16`}>
          <SectionHeading title="ادامه پرداخت" className="mb-2" />
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
            <p className="font-medium text-primary">
              سفارش پرداخت‌نشده:{" "}
              <span className="font-mono" dir="ltr">
                {pendingOrderId}
              </span>
            </p>
            <p className="mt-2 text-secondary">
              سبد خالی است، ولی می‌توانید پرداخت همین سفارش را ادامه دهید.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                disabled={isProcessing}
                onClick={() => void resumeOnlinePayment()}
                className="flex-1"
              >
                ادامه پرداخت همین سفارش
              </Button>
              <Button
                href={hajiasalPath("/shop")}
                variant="outline"
                className="flex-1"
              >
                رفتن به فروشگاه
              </Button>
            </div>
          </div>
          {error ? (
            <p className="text-sm text-red-700 dark:text-red-200" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      );
    }
    return (
      <div className={`${CHECKOUT_STAGE} mx-auto w-full max-w-lg px-4 py-10 sm:py-16`}>
        <EmptyState
          className="my-auto"
          title="سبد خرید خالی است"
          description="برای ادامه سفارش، ابتدا محصولی به سبد اضافه کنید."
          action={<Button href={hajiasalPath("/shop")}>رفتن به فروشگاه</Button>}
        />
      </div>
    );
  }

  if (payableItemCount === 0) {
    return (
      <div className={`${CHECKOUT_STAGE} mx-auto w-full max-w-lg px-4 py-10 sm:py-16`}>
        <EmptyState
          className="my-auto"
          title="کالای قابل خرید در سبد نیست"
          description="همه اقلام سبد ناموجود شده‌اند. سبد را بررسی کنید یا از فروشگاه کالای موجود انتخاب کنید."
          action={
            <>
              <Button href={hajiasalPath("/cart")}>مشاهده سبد</Button>
              <Button href={hajiasalPath("/shop")} variant="outline">
                رفتن به فروشگاه
              </Button>
            </>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        <div className="relative mx-auto max-w-3xl px-4 py-4 md:px-8 md:py-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handlePayClick();
        }}
        className="space-y-3"
      >
        {/* 1. Logistics first — pickup hides delivery addresses */}
        <div className="rounded-2xl border border-border bg-surface p-3 shadow-sm">
          <ShippingMethodSelector
            ref={shippingRef}
            options={shippingOptions}
            value={shippingMethod}
            onChange={(method: ShippingMethod) => {
              setShippingMethod(method);
              setError(null);
              if (method === "pickup") {
                setSelectedAddressId(null);
                setAddressSnapshot(null);
                applyPickupContactAddress();
              }
            }}
          />
        </div>

        {/* 2. Address or pickup unit info */}
        {shippingMethod === "pickup" ? (
          <PickupLocationCard
            address={warehouseAddress}
            phone={warehousePhone}
            receiverName={
              getValues("fullName")?.trim() || user?.fullName?.trim() || undefined
            }
          />
        ) : (
          <motion.div
            ref={addressBlockRef}
            key={addressShakeKey}
            animate={
              addressShakeKey > 0 ? { x: [-8, 8, -8, 8, 0] } : { x: 0 }
            }
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-border bg-white p-3 shadow-sm dark:bg-surface"
          >
            <AddressCardList
              addresses={addresses}
              selectedId={selectedAddressId}
              loading={addressesLoading}
              onAdd={() => setMapSheetOpen(true)}
              onSelect={applyAddressToForm}
              onDelete={(id) => {
                void (async () => {
                  try {
                    const res = await fetch(
                      `/api/account/addresses?id=${encodeURIComponent(id)}`,
                      { method: "DELETE" },
                    );
                    if (!res.ok) {
                      setError("حذف آدرس ناموفق بود. دوباره تلاش کنید.");
                      return;
                    }
                    if (selectedAddressId === id) {
                      setSelectedAddressId(null);
                      setAddressSnapshot(null);
                      setPrefilled(false);
                      await loadAddresses();
                    } else {
                      await loadAddresses({ preserveSelection: true });
                    }
                  } catch {
                    setError("حذف آدرس ناموفق بود. دوباره تلاش کنید.");
                  }
                })();
              }}
            />
            {(errors.province || errors.city || errors.address) && (
              <p className="mt-2 text-xs text-red-500">
                یک آدرس معتبر انتخاب یا ثبت کنید.
              </p>
            )}
          </motion.div>
        )}

        {snappayAvailable ? (
          <div className="rounded-2xl border border-border bg-surface px-3 py-2.5">
            <button
              type="button"
              className="text-sm text-gray-500"
              onClick={() => setShowSnappay((v) => !v)}
            >
              خرید اقساطی با اسنپ‌پی؟
            </button>
            {showSnappay ? (
              <div className="mt-3 space-y-3">
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="pay"
                    checked={paymentMethod === "online"}
                    onChange={() => {
                      setPaymentMethod("online");
                      setSnappayAccepted(false);
                    }}
                    className="mt-1"
                  />
                  پرداخت نقدی از درگاه رسمی
                </label>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="pay"
                    checked={paymentMethod === "snappay"}
                    onChange={() => setPaymentMethod("snappay")}
                    className="mt-1"
                  />
                  اسنپ‌پی (+{SNAPPPAY_FEE_PERCENT}٪)
                </label>
                {paymentMethod === "snappay" ? (
                  <label className="flex cursor-pointer items-start gap-2 text-xs text-secondary">
                    <input
                      type="checkbox"
                      checked={snappayAccepted}
                      onChange={(e) => setSnappayAccepted(e.target.checked)}
                      className="mt-0.5"
                    />
                    قوانین خرید اقساطی اسنپ‌پی را می‌پذیرم.
                  </label>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <Input
          label="یادداشت سفارش (اختیاری)"
          {...register("notes")}
          error={errors.notes?.message}
        />

        <div className="rounded-2xl border border-border bg-surface px-3 py-2.5">
          <CouponTrap
            code={couponCode}
            onCodeChange={(next) => {
              setCouponCode(next);
              if (!next.trim()) {
                clearCoupon();
                return;
              }
              couponClearedByUser.current = false;
              if (
                discount > 0 &&
                next.trim().toUpperCase() !== appliedCouponCode?.trim()
              ) {
                setDiscount(0);
                setCouponMessage("");
                setAppliedCouponCode(null);
              } else if (discount <= 0) {
                setCouponMessage("");
              }
            }}
            onApply={() => {
              couponClearedByUser.current = false;
              void validateCoupon(couponCode);
            }}
            onClear={clearCoupon}
            busy={couponBusy}
            message={couponMessage}
            discount={discount}
          />
        </div>

        {error ? (
          <div
            className="rounded-xl border border-red-300/70 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            <p className="font-medium">پرداخت تکمیل نشد</p>
            <p className="mt-1 text-xs opacity-90">{error}</p>
          </div>
        ) : null}

        {pendingOrderId ? (
          <div
            id="checkout-pending-order"
            className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm"
          >
            <p className="font-medium text-primary">
              سفارش پرداخت‌نشده:{" "}
              <span className="font-mono" dir="ltr">
                {pendingOrderId}
              </span>
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                disabled={isProcessing}
                onClick={() => void resumeOnlinePayment()}
                className="flex-1"
              >
                ادامه پرداخت همین سفارش
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isProcessing}
                onClick={discardPendingAndPayFresh}
                className="flex-1"
              >
                ساخت سفارش جدید
              </Button>
            </div>
          </div>
        ) : null}
        </form>
        </div>
      </div>

      <CheckoutStickyFooter
        total={payableTotal}
        onPay={handlePayClick}
        disabled={isProcessing}
        loading={isProcessing}
        shippingOverride={shipping}
        discount={discount}
        feeLabel={
          paymentMethod === "snappay" ? "کارمزد اسنپ‌پی" : undefined
        }
        feeAmount={
          paymentMethod === "snappay"
            ? Math.max(0, payableTotal - cashTotal)
            : 0
        }
        payableOverride={payableTotal}
        breakdownOpen={breakdownOpen}
        onBreakdownOpenChange={setBreakdownOpen}
        shakeKey={payShakeKey}
      />

      <AddressMapSheet
        open={mapSheetOpen}
        onClose={() => setMapSheetOpen(false)}
        defaultReceiverName={user?.fullName ?? ""}
        defaultReceiverPhone={user?.phone ?? ""}
        onSaved={async (payload) => {
          const res = await fetch("/api/account/addresses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = (await res.json().catch(() => ({}))) as {
            success?: boolean;
            message?: string;
          };
          if (!res.ok || !data.success) {
            throw new Error(
              data.message && /[\u0600-\u06FF]/.test(data.message)
                ? data.message
                : "ذخیره آدرس ناموفق بود",
            );
          }
          setPrefilled(false);
          await loadAddresses();
        }}
      />

      <PaymentHandoffOverlay
        open={isProcessing}
        message="در حال ایجاد نشست امن بانکی..."
      />
      {/* Hard lock: block all pointer events under the shield */}
      {isProcessing ? (
        <div
          className="fixed inset-0 z-[139] bg-transparent"
          aria-hidden
        />
      ) : null}
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
