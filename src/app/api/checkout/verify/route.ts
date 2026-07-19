import { NextResponse } from "next/server";
import { updateOrderStatus, getOrderById } from "@/lib/server/orders";
import { getSessionFromRequest } from "@/lib/auth/session";
import { normalizePhone } from "@/lib/auth/phone";

const PAYABLE_STATUSES = new Set(["pending_payment"]);

function ownsOrder(
  order: NonNullable<Awaited<ReturnType<typeof getOrderById>>>,
  session: NonNullable<ReturnType<typeof getSessionFromRequest>>,
): boolean {
  return (
    order.userId === session.userId ||
    normalizePhone(order.customer.phone) === normalizePhone(session.phone)
  );
}

function failedRedirect(requestUrl: string, orderId?: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const qs = orderId
    ? `payment=failed&orderId=${encodeURIComponent(orderId)}`
    : "payment=failed";
  return NextResponse.redirect(new URL(`/checkout?${qs}`, siteUrl || requestUrl));
}

function cancelledRedirect(orderId: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return NextResponse.redirect(
    new URL(
      `/checkout?payment=cancelled&orderId=${encodeURIComponent(orderId)}`,
      siteUrl,
    ),
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const authority = searchParams.get("Authority");
  const status = searchParams.get("Status");
  const orderId = searchParams.get("orderId");

  if (!authority || !orderId) {
    return failedRedirect(request.url);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  if (status !== "OK") {
    return cancelledRedirect(orderId);
  }

  const merchantId = process.env.ZARINPAL_MERCHANT_ID;
  if (!merchantId || merchantId === "your_merchant_id") {
    return failedRedirect(request.url, orderId);
  }

  const order = await getOrderById(orderId);
  if (!order) {
    return failedRedirect(request.url);
  }

  if (!PAYABLE_STATUSES.has(order.status)) {
    if (order.status === "confirmed" || order.status === "processing") {
      return NextResponse.redirect(
        new URL(
          `/checkout/success?orderId=${encodeURIComponent(orderId)}&tracking=${encodeURIComponent(order.trackingCode ?? "")}`,
          siteUrl,
        ),
      );
    }
    return failedRedirect(request.url, orderId);
  }

  const session = getSessionFromRequest(request);
  if (session && !ownsOrder(order, session)) {
    return failedRedirect(request.url, orderId);
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
          `/checkout/success?orderId=${encodeURIComponent(orderId)}&ref=${encodeURIComponent(String(verifyData.data.ref_id ?? ""))}&tracking=${encodeURIComponent(order.trackingCode ?? "")}`,
          siteUrl,
        ),
      );
    }
  } catch {
    // fall through
  }

  return failedRedirect(request.url, orderId);
}

export async function POST(request: Request) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { success: false, message: "برای تأیید پرداخت باید وارد شوید" },
        { status: 401 },
      );
    }

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
      return NextResponse.json(
        {
          success: false,
          verified: false,
          message: "درگاه زرین‌پال پیکربندی نشده است",
        },
        { status: 503 },
      );
    }

    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json(
        { success: false, message: "سفارش یافت نشد" },
        { status: 404 },
      );
    }

    if (!ownsOrder(order, session)) {
      return NextResponse.json(
        { success: false, message: "دسترسی به این سفارش مجاز نیست" },
        { status: 403 },
      );
    }

    if (!PAYABLE_STATUSES.has(order.status)) {
      return NextResponse.json(
        {
          success: false,
          verified: order.status === "confirmed",
          message:
            order.status === "confirmed"
              ? "این سفارش قبلاً تأیید شده است"
              : "وضعیت سفارش قابل تأیید پرداخت نیست",
        },
        { status: 400 },
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
      trackingCode: order.trackingCode ?? null,
      message: verified ? "پرداخت تأیید شد" : "تأیید پرداخت ناموفق بود",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "خطا در تأیید پرداخت" },
      { status: 500 },
    );
  }
}
