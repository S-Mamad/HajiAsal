import { NextResponse } from "next/server";
import { updateOrderStatus, getOrderById } from "@/lib/server/orders";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const authority = searchParams.get("Authority");
  const status = searchParams.get("Status");
  const orderId = searchParams.get("orderId");

  if (!authority || !orderId) {
    return NextResponse.redirect(
      new URL("/checkout?payment=failed", request.url),
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  if (status !== "OK") {
    return NextResponse.redirect(
      new URL(`/checkout?payment=cancelled&order=${orderId}`, siteUrl),
    );
  }

  const merchantId = process.env.ZARINPAL_MERCHANT_ID;
  if (!merchantId || merchantId === "your_merchant_id") {
    return NextResponse.redirect(
      new URL(`/checkout?payment=failed&orderId=${orderId}`, siteUrl),
    );
  }

  const order = await getOrderById(orderId);
  if (!order) {
    return NextResponse.redirect(
      new URL("/checkout?payment=failed", siteUrl),
    );
  }

  const amountRial = Math.round(order.total * 10);

  try {
    const verifyRes = await fetch(
      "https://api.zarinpal.com/pg/v4/payment/verify.json",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: merchantId,
          amount: amountRial,
          authority,
        }),
      },
    );

    const verifyData = await verifyRes.json();
    if (verifyData.data?.code === 100 || verifyData.data?.code === 101) {
      await updateOrderStatus(orderId, "confirmed");
      return NextResponse.redirect(
        new URL(
          `/checkout/success?orderId=${orderId}&ref=${verifyData.data.ref_id ?? ""}`,
          siteUrl,
        ),
      );
    }
  } catch {
    // fall through
  }

  return NextResponse.redirect(
    new URL(`/checkout?payment=failed&order=${orderId}`, siteUrl),
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const authority = body.authority as string;
    const orderId = body.orderId as string;

    if (!authority || !orderId) {
      return NextResponse.json(
        { success: false, message: "اطلاعات تأیید نامعتبر است" },
        { status: 400 },
      );
    }

    const merchantId = process.env.ZARINPAL_MERCHANT_ID;
    if (!merchantId || merchantId === "your_merchant_id") {
      return NextResponse.json({
        success: false,
        verified: false,
        message: "درگاه زرین‌پال پیکربندی نشده است",
      });
    }

    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json(
        { success: false, message: "سفارش یافت نشد" },
        { status: 404 },
      );
    }

    const verifyRes = await fetch(
      "https://api.zarinpal.com/pg/v4/payment/verify.json",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: merchantId,
          amount: Math.round(order.total * 10),
          authority,
        }),
      },
    );

    const verifyData = await verifyRes.json();
    const verified =
      verifyData.data?.code === 100 || verifyData.data?.code === 101;

    if (verified) {
      await updateOrderStatus(orderId, "confirmed");
    }

    return NextResponse.json({
      success: verified,
      verified,
      refId: verifyData.data?.ref_id ?? null,
      message: verified ? "پرداخت تأیید شد" : "تأیید پرداخت ناموفق بود",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "خطا در تأیید پرداخت" },
      { status: 500 },
    );
  }
}
