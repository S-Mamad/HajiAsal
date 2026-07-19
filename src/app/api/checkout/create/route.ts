import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getOrderById, updateOrderStatus } from "@/lib/server/orders";
import { normalizePhone } from "@/lib/auth/phone";

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

  const merchantId = process.env.ZARINPAL_MERCHANT_ID;
  if (!merchantId || merchantId === "your_merchant_id") {
    return NextResponse.json(
      {
        success: false,
        available: false,
        message:
          "درگاه زرین‌پال پیکربندی نشده است. از پرداخت در محل یا کارت‌به‌کارت استفاده کنید.",
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

    const zarinRes = await fetch(
      "https://api.zarinpal.com/pg/v4/payment/request.json",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: merchantId,
          amount: amountRial,
          callback_url: callbackUrl,
          description: parsed.data.description ?? `سفارش ${order.id}`,
          metadata: { order_id: order.id, mobile: session.phone },
        }),
      },
    );

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

    await updateOrderStatus(order.id, "pending_payment");

    return NextResponse.json({
      success: true,
      available: true,
      authority,
      redirectUrl: `https://www.zarinpal.com/pg/StartPay/${authority}`,
      callbackUrl,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "خطا در ایجاد درخواست پرداخت" },
      { status: 500 },
    );
  }
}
