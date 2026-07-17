import { NextResponse } from "next/server";
import { checkoutApiSchema } from "@/lib/validations/checkout";
import { createOrder } from "@/lib/server/orders";
import { validateCouponAsync } from "@/lib/server/coupons";
import {
  rebuildOrderItems,
  calcShippingCost,
} from "@/lib/server/order-pricing";
import { getSessionFromRequest } from "@/lib/auth/session";
import { normalizePhone } from "@/lib/auth/phone";
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limited = checkRateLimit(`orders:${ip}`, 8, 15 * 60 * 1000);
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
      paymentMethod?: "cod" | "card_to_card" | "online";
      shippingMethod?: string;
    };
    const couponCode = extra.couponCode;
    const paymentMethod = extra.paymentMethod ?? "cod";
    const shippingMethod = extra.shippingMethod ?? "standard";

    const subtotal = rebuilt.subtotal;
    const shipping = await calcShippingCost(shippingMethod, subtotal);

    let discount = 0;
    if (couponCode) {
      const couponResult = await validateCouponAsync(couponCode, subtotal);
      if (!couponResult.valid) {
        return NextResponse.json(
          { success: false, message: couponResult.message },
          { status: 400 },
        );
      }
      discount = couponResult.discount;
    }

    const total = Math.max(0, subtotal + shipping - discount);

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
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      trackingCode: order.trackingCode,
      status: order.status,
      total: order.total,
      message:
        paymentMethod === "cod"
          ? "سفارش ثبت شد. پرداخت هنگام تحویل انجام می‌شود."
          : paymentMethod === "online"
            ? "سفارش ثبت شد. در حال انتقال به درگاه پرداخت..."
            : "سفارش ثبت شد. اطلاعات کارت‌به‌کارت برای شما ارسال می‌شود.",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "خطای سرور" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
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
