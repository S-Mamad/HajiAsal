import { NextResponse } from "next/server";
import { checkoutApiSchema } from "@/lib/validations/checkout";
import {
  createOrder,
  computeOrderTotal,
  confirmPaidOrder,
  expireStalePendingOrders,
  type PaymentMethod,
} from "@/lib/server/orders";
import { validateCouponAsync } from "@/lib/server/coupons";
import {
  rebuildOrderItems,
  calcShippingCost,
} from "@/lib/server/order-pricing";
import { getSessionFromRequest } from "@/lib/auth/session";
import { normalizePhone } from "@/lib/auth/phone";
import { checkRateLimitAsync, getClientIp } from "@/lib/server/rate-limit";
import { getProductByIdAsync } from "@/lib/server/products-store";
import { getAddressesByUserId } from "@/lib/server/profiles";
import {
  applySnappayFee,
  isSnappayConfigured,
} from "@/lib/server/snappay";
import { isZibalConfigured } from "@/lib/server/zibal";
import { isBelowGatewayMinimum } from "@/lib/server/payment-min";
import { enqueueTelegramAlert } from "@/lib/server/telegram-alert-queue";
import { sitePublicUrl } from "@/lib/paths";
import {
  CART_HOLD_COOKIE,
  consumeCartHoldsForSession,
} from "@/lib/server/cart-holds";

function readHoldSession(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(
    new RegExp(`(?:^|;\\s*)${CART_HOLD_COOKIE}=([a-f0-9]{32})`, "i"),
  );
  return match?.[1] ?? null;
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limited = await checkRateLimitAsync(`orders:${ip}`, 8, 15 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSec) },
        },
      );
    }

    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "برای ثبت سفارش ابتدا وارد حساب کاربری شوید",
        },
        { status: 401 },
      );
    }

    // Soft-expire orphan unpaid orders (best-effort; never blocks checkout).
    try {
      await expireStalePendingOrders();
    } catch {
      /* ignore */
    }

    const body = await request.json();
    const parsed = checkoutApiSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "اطلاعات سفارش نامعتبر است",
          errors: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { customer: rawCustomer, items: rawItems } = parsed.data;

    const extra = body as {
      couponCode?: string;
      shippingMethod?: string;
      addressId?: string;
    };

    // Zero Trust address: prefer server-owned address when addressId is provided.
    let customer = rawCustomer;
    if (extra.addressId && session.userId) {
      const owned = await getAddressesByUserId(session.userId);
      const matched = owned.find((a) => a.id === extra.addressId);
      if (!matched) {
        return NextResponse.json(
          { success: false, message: "آدرس انتخاب‌شده معتبر نیست" },
          { status: 400 },
        );
      }
      customer = {
        ...rawCustomer,
        // Keep authenticated phone; never trust client/address phone for billing identity.
        phone: rawCustomer.phone,
        fullName:
          matched.receiverName?.trim() ||
          rawCustomer.fullName ||
          "خریدار حاجی‌عسل",
        province: matched.province,
        city: matched.city,
        address: matched.address,
        postalCode:
          matched.postalCode?.length === 10 &&
          matched.postalCode !== "0000000000"
            ? matched.postalCode
            : rawCustomer.postalCode,
        notes: [
          rawCustomer.notes?.trim() || "",
          matched.receiverPhone &&
          normalizePhone(matched.receiverPhone) &&
          normalizePhone(matched.receiverPhone) !==
            normalizePhone(rawCustomer.phone)
            ? `تماس گیرنده: ${matched.receiverPhone}`
            : "",
        ]
          .filter(Boolean)
          .join("\n")
          .slice(0, 500),
      };
    }

    const shippingMethod = extra.shippingMethod ?? "standard";
    if (shippingMethod !== "pickup") {
      const postal = customer.postalCode ?? "";
      if (!/^\d{10}$/.test(postal) || postal === "0000000000") {
        return NextResponse.json(
          {
            success: false,
            message: "برای ارسال، کد پستی ۱۰ رقمی معتبر لازم است",
          },
          { status: 400 },
        );
      }
    } else if (
      !customer.postalCode ||
      customer.postalCode === "0000000000" ||
      !/^\d{10}$/.test(customer.postalCode)
    ) {
      // Pickup warehouse placeholder — not used for courier routing.
      customer = { ...customer, postalCode: "8913183478" };
    }

    const customerPhone = normalizePhone(customer.phone);
    if (!customerPhone) {
      return NextResponse.json(
        { success: false, message: "شماره موبایل نامعتبر است" },
        { status: 400 },
      );
    }

    const sessionPhone = normalizePhone(session.phone);
    if (sessionPhone && customerPhone !== sessionPhone) {
      return NextResponse.json(
        {
          success: false,
          message: "شماره موبایل باید با حساب کاربری یکسان باشد",
        },
        { status: 400 },
      );
    }

    const rebuilt = await rebuildOrderItems(rawItems, {
      holdSessionId: readHoldSession(request),
    });
    if (!rebuilt.ok) {
      return NextResponse.json(
        { success: false, message: rebuilt.message },
        { status: 400 },
      );
    }

    const couponCode = extra.couponCode;
    const paymentMethod = parsed.data.paymentMethod as PaymentMethod;

    const subtotal = rebuilt.subtotal;
    const shipping = await calcShippingCost(shippingMethod, subtotal);

    const sellerIdsInCart: string[] = [];
    const sellerLineSubtotals: Record<string, number> = {};
    for (const line of rebuilt.items) {
      const product = await getProductByIdAsync(line.productId);
      if (product?.sellerId) {
        sellerIdsInCart.push(product.sellerId);
        const lineTotal = line.weight.price * line.quantity;
        sellerLineSubtotals[product.sellerId] =
          (sellerLineSubtotals[product.sellerId] ?? 0) + lineTotal;
      }
    }

    let discount = 0;
    if (couponCode) {
      const couponResult = await validateCouponAsync(couponCode, subtotal, {
        sellerIdsInCart,
        sellerLineSubtotals,
      });
      if (!couponResult.valid) {
        void enqueueTelegramAlert("coupon.rejected", {
          code: couponCode,
          valid: false,
          message: couponResult.message,
          phone: customerPhone,
          subtotal,
          source: "checkout",
        });
        return NextResponse.json(
          { success: false, message: couponResult.message },
          { status: 400 },
        );
      }
      discount = couponResult.discount;
    }

    const cashTotal = computeOrderTotal(subtotal, shipping, discount);
    const total =
      paymentMethod === "snappay" ? applySnappayFee(cashTotal) : cashTotal;
    const freeCheckout = isBelowGatewayMinimum(total);

    if (paymentMethod === "online" && !freeCheckout && !isZibalConfigured()) {
      return NextResponse.json(
        { success: false, message: "درگاه زیبال در دسترس نیست" },
        { status: 400 },
      );
    }
    if (paymentMethod === "snappay" && !freeCheckout && !isSnappayConfigured()) {
      return NextResponse.json(
        { success: false, message: "درگاه اسنپ‌پی در دسترس نیست" },
        { status: 400 },
      );
    }

    const order = await createOrder({
      customer: { ...customer, phone: customerPhone },
      items: rebuilt.items,
      subtotal,
      shipping,
      discount,
      couponCode,
      paymentMethod: freeCheckout ? "online" : paymentMethod,
      shippingMethod,
      userId: session?.userId,
      totalOverride: freeCheckout ? cashTotal : total,
    });

    void enqueueTelegramAlert("order.created", { order });
    if (couponCode && discount > 0) {
      void enqueueTelegramAlert("coupon.applied", {
        code: couponCode,
        valid: true,
        discount,
        phone: customerPhone,
        subtotal,
        orderId: order.id,
        source: "checkout",
      });
    }

    // used_count increments on payment confirm (pending_payment → confirmed)

    if (isBelowGatewayMinimum(order.total)) {
      const holdSession = readHoldSession(request);
      if (holdSession) await consumeCartHoldsForSession(holdSession);
      const confirmed = await confirmPaidOrder(order.id);
      if (!confirmed.ok || !confirmed.order) {
        return NextResponse.json(
          {
            success: false,
            message: "ثبت سفارش رایگان ناموفق بود. دوباره تلاش کنید.",
          },
          { status: 500 },
        );
      }
      const successUrl = `${sitePublicUrl()}/checkout/success?orderId=${encodeURIComponent(confirmed.order.id)}&free=1`;
      return NextResponse.json({
        success: true,
        free: true,
        orderId: confirmed.order.id,
        trackingCode: confirmed.order.trackingCode,
        status: confirmed.order.status,
        total: confirmed.order.total,
        redirectUrl: successUrl,
        message: "سفارش رایگان ثبت شد.",
      });
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      trackingCode: order.trackingCode,
      status: order.status,
      total: order.total,
      message:
        paymentMethod === "snappay"
          ? "سفارش ثبت شد. در حال انتقال به درگاه اسنپ‌پی..."
          : "سفارش ثبت شد. در حال انتقال به درگاه پرداخت...",
    });
  } catch (error) {
    void enqueueTelegramAlert("api.error_critical", {
      route: "orders",
      message: error instanceof Error ? error.message : "خطای سرور",
      ip: getClientIp(request),
    });
    return NextResponse.json(
      { success: false, message: "خطای سرور" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const limited = await checkRateLimitAsync(
    `orders-track:${ip}`,
    40,
    15 * 60 * 1000,
  );
  if (!limited.ok) {
    return NextResponse.json(
      { error: "تعداد درخواست‌ها زیاد است" },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("id");
  const tracking = searchParams.get("tracking");
  const phoneRaw = searchParams.get("phone");

  if (!orderId && !tracking) {
    return NextResponse.json(
      { error: "شناسه سفارش یا کد پیگیری الزامی است" },
      { status: 400 },
    );
  }

  const {
    getOrderById,
    getOrderByTracking,
    getOrderByPhoneAndTracking,
  } = await import("@/lib/server/orders");
  const session = getSessionFromRequest(request);

  let order = null;

  if (orderId) {
    order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: "سفارش یافت نشد" }, { status: 404 });
    }
    const owns =
      session &&
      (order.userId === session.userId ||
        normalizePhone(order.customer.phone) ===
          normalizePhone(session.phone));
    // Success-page deep link: orderId + tracking from gateway redirect (session may expire).
    const trackingParam = tracking?.trim() ?? "";
    const trackingMatch =
      trackingParam.length > 0 &&
      Boolean(order.trackingCode) &&
      trackingParam === order.trackingCode;
    if (!owns && !trackingMatch) {
      return NextResponse.json(
        { error: "دسترسی به این سفارش مجاز نیست" },
        { status: 403 },
      );
    }
  } else if (tracking && phoneRaw) {
    const phone = normalizePhone(phoneRaw);
    if (!phone) {
      return NextResponse.json(
        { error: "شماره موبایل نامعتبر است" },
        { status: 400 },
      );
    }
    order = await getOrderByPhoneAndTracking(phone, tracking);
  } else if (tracking) {
    // Public track by code only — limited fields, no PII
    order = await getOrderByTracking(tracking);
    if (!order) {
      return NextResponse.json({ error: "سفارش یافت نشد" }, { status: 404 });
    }
    return NextResponse.json({
      order: {
        id: order.id,
        status: order.status,
        paymentMethod: order.paymentMethod,
        trackingCode: order.trackingCode,
        total: order.total,
        createdAt: order.createdAt,
        shippingMethod: order.shippingMethod,
        items: order.items.map((i) => ({
          title: i.title,
          quantity: i.quantity,
          weight: i.weight.label,
        })),
      },
    });
  }

  if (!order) {
    return NextResponse.json({ error: "سفارش یافت نشد" }, { status: 404 });
  }

  return NextResponse.json({
    order: {
      id: order.id,
      status: order.status,
      paymentMethod: order.paymentMethod,
      trackingCode: order.trackingCode,
      total: order.total,
      createdAt: order.createdAt,
      shippingMethod: order.shippingMethod,
      items: order.items.map((i) => ({
        title: i.title,
        quantity: i.quantity,
        weight: i.weight.label,
      })),
    },
  });
}
