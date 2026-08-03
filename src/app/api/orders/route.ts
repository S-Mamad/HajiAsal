import { NextResponse } from "next/server";
import { checkoutApiSchema } from "@/lib/validations/checkout";
import {
  createOrder,
  computeOrderTotal,
  expireStalePendingOrders,
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
import {
  applySnappayFee,
  isSnappayConfigured,
} from "@/lib/server/snappay";
import type { PaymentMethod } from "@/lib/server/orders";

function isZarinpalConfigured(): boolean {
  const merchantId = process.env.ZARINPAL_MERCHANT_ID;
  return Boolean(merchantId && merchantId !== "your_merchant_id");
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

    const { customer, items: rawItems } = parsed.data;

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

    const rebuilt = await rebuildOrderItems(rawItems);
    if (!rebuilt.ok) {
      return NextResponse.json(
        { success: false, message: rebuilt.message },
        { status: 400 },
      );
    }

    const extra = body as {
      couponCode?: string;
      shippingMethod?: string;
    };
    const couponCode = extra.couponCode;
    const paymentMethod = parsed.data.paymentMethod as PaymentMethod;
    const shippingMethod = extra.shippingMethod ?? "standard";

    if (paymentMethod === "online" && !isZarinpalConfigured()) {
      return NextResponse.json(
        { success: false, message: "درگاه زرین‌پال در دسترس نیست" },
        { status: 400 },
      );
    }
    if (paymentMethod === "snappay" && !isSnappayConfigured()) {
      return NextResponse.json(
        { success: false, message: "درگاه اسنپ‌پی در دسترس نیست" },
        { status: 400 },
      );
    }

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

    const order = await createOrder({
      customer: { ...customer, phone: customerPhone },
      items: rebuilt.items,
      subtotal,
      shipping,
      discount,
      couponCode,
      paymentMethod,
      shippingMethod,
      userId: session?.userId,
      totalOverride: total,
    });

    // used_count increments on payment confirm (pending_payment → confirmed)

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
  } catch {
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
    if (!owns) {
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
