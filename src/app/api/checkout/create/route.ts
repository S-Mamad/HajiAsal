import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getOrderById } from "@/lib/server/orders";
import { normalizePhone } from "@/lib/auth/phone";
import {
  getReusablePaymentBinding,
  setOrderPaymentRef,
  withPaymentCreateLock,
} from "@/lib/server/payment-refs";
import { checkRateLimitAsync, getClientIp } from "@/lib/server/rate-limit";
import {
  getZibalMerchant,
  isZibalConfigured,
  isZibalSandboxMerchant,
  zibalPostJson,
  zibalRequestResultMessage,
  zibalRequestUrl,
  zibalStartPayUrl,
  type ZibalRequestResult,
} from "@/lib/server/zibal";
import { enqueueTelegramAlert } from "@/lib/server/telegram-alert-queue";
import { confirmPaidOrder } from "@/lib/server/orders";
import { isBelowGatewayMinimum } from "@/lib/server/payment-min";
import { sitePublicUrl } from "@/lib/paths";
import {
  CART_HOLD_COOKIE,
  consumeCartHoldsForSession,
} from "@/lib/server/cart-holds";

function consumeHoldFromRequest(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(
    new RegExp(`(?:^|;\\s*)${CART_HOLD_COOKIE}=([a-f0-9]{32})`, "i"),
  );
  if (match?.[1]) {
    void consumeCartHoldsForSession(match[1]);
  }
}

const createSchema = z.object({
  orderId: z.string().min(1),
  description: z.string().optional(),
});

export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { success: false, message: "برای پرداخت آنلاین باید وارد شوید" },
      { status: 401 },
    );
  }

  const merchant = getZibalMerchant();
  if (!merchant || !isZibalConfigured()) {
    return NextResponse.json(
      {
        success: false,
        available: false,
        message:
          "درگاه زیبال پیکربندی نشده است. از روش پرداخت دیگری استفاده کنید.",
      },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "اطلاعات پرداخت نامعتبر است" },
        { status: 400 },
      );
    }

    const orderId = parsed.data.orderId;
    const userKey = session.userId || normalizePhone(session.phone) || "anon";

    return await withPaymentCreateLock(orderId, async () => {
      const order = await getOrderById(orderId);
      if (!order) {
        return NextResponse.json(
          { success: false, message: "سفارش یافت نشد" },
          { status: 404 },
        );
      }

      const owns =
        order.userId === session.userId ||
        normalizePhone(order.customer.phone) === normalizePhone(session.phone);

      if (!owns) {
        return NextResponse.json(
          { success: false, message: "دسترسی به این سفارش مجاز نیست" },
          { status: 403 },
        );
      }

      if (order.paymentMethod === "snappay") {
        return NextResponse.json(
          {
            success: false,
            message:
              "این سفارش برای اسنپ‌پی است. از دکمه ادامه پرداخت اقساطی استفاده کنید.",
          },
          { status: 400 },
        );
      }

      if (order.status === "cancelled") {
        return NextResponse.json(
          { success: false, message: "این سفارش لغو شده است" },
          { status: 400 },
        );
      }

      if (order.status !== "pending_payment") {
        return NextResponse.json(
          {
            success: false,
            message: "این سفارش برای پرداخت آنلاین در دسترس نیست",
          },
          { status: 400 },
        );
      }

      const amountToman = Math.round(order.total);
      const amountRial = Math.round(order.total * 10);

      if (isBelowGatewayMinimum(amountToman)) {
        consumeHoldFromRequest(request);
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
        const redirectUrl = `${sitePublicUrl()}/checkout/success?orderId=${encodeURIComponent(confirmed.order.id)}&free=1`;
        return NextResponse.json({
          success: true,
          free: true,
          available: true,
          redirectUrl,
          orderId: confirmed.order.id,
          message: "سفارش رایگان ثبت شد.",
        });
      }

      if (!Number.isFinite(amountRial) || amountRial < 1000) {
        return NextResponse.json(
          {
            success: false,
            message: "مبلغ سفارش برای درگاه زیبال معتبر نیست (حداقل ۱۰۰۰ ریال)",
          },
          { status: 400 },
        );
      }

      const reusable = isZibalSandboxMerchant()
        ? null
        : await getReusablePaymentBinding(
            order.id,
            "zibal",
            amountToman,
          );
      if (reusable?.paymentRef) {
        const redirectUrl = zibalStartPayUrl(reusable.paymentRef);
        const reuseAlertRl = await checkRateLimitAsync(
          `tg-pay-reuse:${order.id}`,
          1,
          5 * 60 * 1000,
        );
        if (reuseAlertRl.ok) {
          void enqueueTelegramAlert("payment.reuse", {
            orderId: order.id,
            gateway: "zibal",
            amountToman,
            paymentRef: reusable.paymentRef,
          });
        }
        return NextResponse.json({
          success: true,
          available: true,
          reused: true,
          trackId: reusable.paymentRef,
          redirectUrl,
        });
      }

      const userRl = await checkRateLimitAsync(
        `pay-create:user:${userKey}`,
        8,
        15 * 60 * 1000,
      );
      if (!userRl.ok) {
        void enqueueTelegramAlert("payment.spam_blocked", {
          orderId,
          gateway: "zibal",
          reason: "user_rate_limit",
        });
        return NextResponse.json(
          {
            success: false,
            message: "تعداد درخواست پرداخت زیاد است. کمی صبر کنید.",
          },
          {
            status: 429,
            headers: { "Retry-After": String(userRl.retryAfterSec) },
          },
        );
      }

      const orderRl = await checkRateLimitAsync(
        `pay-create:order:${orderId}`,
        3,
        5 * 60 * 1000,
      );
      if (!orderRl.ok) {
        void enqueueTelegramAlert("payment.spam_blocked", {
          orderId,
          gateway: "zibal",
          reason: "order_rate_limit",
        });
        return NextResponse.json(
          {
            success: false,
            message:
              "برای این سفارش چند بار درگاه ساخته شده. از لینک قبلی استفاده کنید یا چند دقیقه صبر کنید.",
          },
          {
            status: 429,
            headers: { "Retry-After": String(orderRl.retryAfterSec) },
          },
        );
      }

      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const callbackUrl = `${siteUrl}/api/checkout/verify?orderId=${encodeURIComponent(order.id)}`;

      const zibalData = await zibalPostJson<ZibalRequestResult>(
        zibalRequestUrl(),
        {
          merchant,
          amount: amountRial,
          callbackUrl,
          description: parsed.data.description ?? `سفارش ${order.id}`,
          orderId: order.id,
          mobile: session.phone,
        },
      );

      const trackId = zibalData.trackId;
      if (zibalData.result !== 100 || trackId == null) {
        void enqueueTelegramAlert("api.error_critical", {
          route: "checkout/create",
          message:
            zibalData.message ||
            zibalRequestResultMessage(Number(zibalData.result ?? 0)) ||
            "خطا در اتصال به زیبال",
          orderId: order.id,
        });
        return NextResponse.json(
          {
            success: false,
            message:
              zibalData.message ||
              zibalRequestResultMessage(Number(zibalData.result ?? 0)) ||
              "خطا در اتصال به زیبال",
          },
          { status: 502 },
        );
      }

      const redirectUrl = zibalStartPayUrl(trackId);
      await setOrderPaymentRef(order.id, "zibal", String(trackId), {
        amountToman,
        redirectUrl,
      });

      void enqueueTelegramAlert("payment.create", {
        orderId: order.id,
        gateway: "zibal",
        amountToman,
        paymentRef: String(trackId),
      });

      return NextResponse.json({
        success: true,
        available: true,
        reused: false,
        trackId: String(trackId),
        redirectUrl,
        callbackUrl,
      });
    });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "خطا در ایجاد درخواست پرداخت";
    void enqueueTelegramAlert("api.error_critical", {
      route: "checkout/create",
      message: msg,
      ip: getClientIp(request),
    });
    return NextResponse.json(
      {
        success: false,
        message: msg,
      },
      { status: 500 },
    );
  }
}
