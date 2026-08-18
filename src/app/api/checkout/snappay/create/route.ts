import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getOrderById } from "@/lib/server/orders";
import { normalizePhone } from "@/lib/auth/phone";
import {
  createSnappayPayment,
  isSnappayConfigured,
} from "@/lib/server/snappay";
import {
  getReusablePaymentBinding,
  setOrderPaymentRef,
  withPaymentCreateLock,
} from "@/lib/server/payment-refs";
import { checkRateLimitAsync, getClientIp } from "@/lib/server/rate-limit";
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
  if (match?.[1]) void consumeCartHoldsForSession(match[1]);
}

const createSchema = z.object({
  orderId: z.string().min(1),
});

export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { success: false, message: "برای پرداخت باید وارد شوید" },
      { status: 401 },
    );
  }

  if (!isSnappayConfigured()) {
    return NextResponse.json(
      {
        success: false,
        available: false,
        message: "درگاه اسنپ‌پی پیکربندی نشده است.",
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

      if (order.paymentMethod !== "snappay") {
        return NextResponse.json(
          { success: false, message: "این سفارش برای اسنپ‌پی نیست" },
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
            message: "این سفارش برای پرداخت اقساطی در دسترس نیست",
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
        return NextResponse.json({
          success: true,
          free: true,
          available: true,
          redirectUrl: `${sitePublicUrl()}/checkout/success?orderId=${encodeURIComponent(confirmed.order.id)}&free=1`,
          orderId: confirmed.order.id,
          message: "سفارش رایگان ثبت شد.",
        });
      }

      const reusable = await getReusablePaymentBinding(
        order.id,
        "snappay",
        amountToman,
      );
      if (reusable?.paymentRef && reusable.redirectUrl) {
        const reuseAlertRl = await checkRateLimitAsync(
          `tg-pay-reuse:${order.id}`,
          1,
          5 * 60 * 1000,
        );
        if (reuseAlertRl.ok) {
          void enqueueTelegramAlert("payment.reuse", {
            orderId: order.id,
            gateway: "snappay",
            amountToman,
            paymentRef: reusable.paymentRef,
          });
        }
        return NextResponse.json({
          success: true,
          available: true,
          reused: true,
          paymentToken: reusable.paymentRef,
          redirectUrl: reusable.redirectUrl,
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
          gateway: "snappay",
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
          gateway: "snappay",
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
      const returnURL = `${siteUrl}/api/checkout/snappay/verify?orderId=${encodeURIComponent(order.id)}`;

      const cartList = order.items.map((item, index) => ({
        id: index + 1,
        name: item.title.slice(0, 100),
        count: item.quantity,
        amount: Math.round(item.weight.price * item.quantity * 10),
        category: "GROCERY",
        commissionType: 100,
      }));

      const productsRial = cartList.reduce((sum, line) => sum + line.amount, 0);
      const discountRial = Math.round(Math.max(0, order.discount) * 10);
      const remainderRial = Math.max(
        0,
        amountRial - productsRial + discountRial,
      );
      if (remainderRial > 0) {
        cartList.push({
          id: cartList.length + 1,
          name: "هزینه ارسال و خدمات",
          count: 1,
          amount: remainderRial,
          category: "GROCERY",
          commissionType: 100,
        });
      }

      const payment = await createSnappayPayment({
        amountRial,
        cartList,
        returnURL,
        transactionId: order.id,
        mobile: session.phone,
        discountAmount: discountRial,
      });

      await setOrderPaymentRef(order.id, "snappay", payment.paymentToken, {
        amountToman,
        redirectUrl: payment.paymentPageUrl,
      });

      void enqueueTelegramAlert("payment.create", {
        orderId: order.id,
        gateway: "snappay",
        amountToman,
        paymentRef: payment.paymentToken,
      });

      return NextResponse.json({
        success: true,
        available: true,
        reused: false,
        paymentToken: payment.paymentToken,
        redirectUrl: payment.paymentPageUrl,
      });
    });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "خطا در اتصال به درگاه اسنپ‌پی";
    void enqueueTelegramAlert("api.error_critical", {
      route: "checkout/snappay/create",
      message: msg,
      ip: getClientIp(request),
    });
    return NextResponse.json(
      {
        success: false,
        message: msg,
      },
      { status: 502 },
    );
  }
}
