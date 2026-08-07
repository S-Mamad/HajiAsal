import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getOrderById } from "@/lib/server/orders";
import { normalizePhone } from "@/lib/auth/phone";
import { setOrderPaymentRef } from "@/lib/server/payment-refs";
import {
  getZarinpalMerchantId,
  zarinpalRequestUrl,
  zarinpalStartPayUrl,
} from "@/lib/server/zarinpal";

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

  const merchantId = getZarinpalMerchantId();
  if (!merchantId) {
    return NextResponse.json(
      {
        success: false,
        available: false,
        message:
          "درگاه زرین‌پال پیکربندی نشده است. از روش پرداخت دیگری استفاده کنید.",
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

    const zarinRes = await fetch(zarinpalRequestUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: merchantId,
        amount: amountRial,
        callback_url: callbackUrl,
        description: parsed.data.description ?? `سفارش ${order.id}`,
        metadata: { order_id: order.id, mobile: session.phone },
      }),
    });

    const zarinData = await zarinRes.json();
    const authority = zarinData.data?.authority;

    if (zarinData.data?.code !== 100 || !authority) {
      return NextResponse.json(
        {
          success: false,
          message: zarinData.errors?.message ?? "خطا در اتصال به زرین‌پال",
        },
        { status: 502 },
      );
    }

    await setOrderPaymentRef(order.id, "zarinpal", String(authority));

    return NextResponse.json({
      success: true,
      available: true,
      authority,
      redirectUrl: zarinpalStartPayUrl(String(authority)),
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
