import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getOrderById } from "@/lib/server/orders";
import { normalizePhone } from "@/lib/auth/phone";
import { setOrderPaymentRef } from "@/lib/server/payment-refs";
import {
  getZibalMerchant,
  isZibalConfigured,
  zibalPostJson,
  zibalRequestResultMessage,
  zibalRequestUrl,
  zibalStartPayUrl,
  type ZibalRequestResult,
} from "@/lib/server/zibal";

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

    const order = await getOrderById(parsed.data.orderId);
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

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const callbackUrl = `${siteUrl}/api/checkout/verify?orderId=${encodeURIComponent(order.id)}`;
    const amountRial = Math.round(order.total * 10);

    if (!Number.isFinite(amountRial) || amountRial < 1000) {
      return NextResponse.json(
        {
          success: false,
          message: "مبلغ سفارش برای درگاه زیبال معتبر نیست (حداقل ۱۰۰۰ ریال)",
        },
        { status: 400 },
      );
    }

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

    await setOrderPaymentRef(order.id, "zibal", String(trackId));

    return NextResponse.json({
      success: true,
      available: true,
      trackId: String(trackId),
      redirectUrl: zibalStartPayUrl(trackId),
      callbackUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "خطا در ایجاد درخواست پرداخت",
      },
      { status: 500 },
    );
  }
}
