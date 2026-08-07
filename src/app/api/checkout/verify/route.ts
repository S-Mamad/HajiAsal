import { NextResponse } from "next/server";
import { confirmPaidOrder, getOrderById } from "@/lib/server/orders";
import { getSessionFromRequest } from "@/lib/auth/session";
import { normalizePhone } from "@/lib/auth/phone";
import {
  assertOrderPaymentRef,
  setOrderSettleRef,
} from "@/lib/server/payment-refs";
import { checkRateLimitAsync, getClientIp } from "@/lib/server/rate-limit";
import { refundOrderAtGateway } from "@/lib/server/payment-refund";
import {
  getZarinpalMerchantId,
  zarinpalVerifyUrl,
} from "@/lib/server/zarinpal";

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

function successRedirect(orderId: string, tracking: string, ref?: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const qs = new URLSearchParams({
    orderId,
    tracking,
  });
  if (ref) qs.set("ref", ref);
  return NextResponse.redirect(
    new URL(`/checkout/success?${qs.toString()}`, siteUrl),
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const authority = searchParams.get("Authority");
  const status = searchParams.get("Status");
  const orderId = searchParams.get("orderId");

  const ip = getClientIp(request);
  const limited = await checkRateLimitAsync(
    `checkout-verify:${ip}`,
    30,
    15 * 60 * 1000,
  );
  if (!limited.ok) {
    return failedRedirect(request.url, orderId ?? undefined);
  }

  if (!authority || !orderId) {
    return failedRedirect(request.url);
  }

  if (status !== "OK") {
    return cancelledRedirect(orderId);
  }

  const merchantId = getZarinpalMerchantId();
  if (!merchantId) {
    return failedRedirect(request.url, orderId);
  }

  const order = await getOrderById(orderId);
  if (!order) {
    return failedRedirect(request.url);
  }

  if (!PAYABLE_STATUSES.has(order.status)) {
    if (
      order.status === "confirmed" ||
      order.status === "processing" ||
      order.status === "shipped" ||
      order.status === "delivered"
    ) {
      return successRedirect(orderId, order.trackingCode ?? "");
    }
    return failedRedirect(request.url, orderId);
  }

  // Auth via bound payment_ref (session optional — cookie may expire on gateway return).
  const refOk = await assertOrderPaymentRef(orderId, "zarinpal", authority);
  if (!refOk) {
    return failedRedirect(request.url, orderId);
  }

  const amountRial = Math.round(order.total * 10);

  try {
    const verifyRes = await fetch(zarinpalVerifyUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: merchantId,
        amount: amountRial,
        authority,
      }),
    });

    const verifyData = await verifyRes.json();
    if (verifyData.data?.code === 100 || verifyData.data?.code === 101) {
      const settleRef = String(verifyData.data.ref_id ?? "");
      if (settleRef) await setOrderSettleRef(orderId, settleRef);
      const confirmed = await confirmPaidOrder(orderId);
      if (!confirmed.ok) {
        // Money already settled at gateway — attempt auto-refund so we don't leave unpaid charged orders.
        try {
          await refundOrderAtGateway(order);
        } catch (error) {
          console.error(
            "[checkout/verify] auto-refund after confirm failure:",
            error instanceof Error ? error.message : error,
          );
        }
        return failedRedirect(request.url, orderId);
      }
      const tracking = confirmed.order.trackingCode ?? "";
      return successRedirect(orderId, tracking, settleRef);
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

    const merchantId = getZarinpalMerchantId();
    if (!merchantId) {
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
          verified:
            order.status === "confirmed" ||
            order.status === "processing" ||
            order.status === "shipped" ||
            order.status === "delivered",
          message:
            order.status === "confirmed" ||
            order.status === "processing" ||
            order.status === "shipped" ||
            order.status === "delivered"
              ? "این سفارش قبلاً تأیید شده است"
              : "وضعیت سفارش قابل تأیید پرداخت نیست",
        },
        { status: 400 },
      );
    }

    const refOk = await assertOrderPaymentRef(orderId, "zarinpal", authority);
    if (!refOk) {
      return NextResponse.json(
        { success: false, message: "مرجع پرداخت با سفارش هم‌خوانی ندارد" },
        { status: 403 },
      );
    }

    const verifyRes = await fetch(zarinpalVerifyUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: merchantId,
        amount: Math.round(order.total * 10),
        authority,
      }),
    });

    const verifyData = await verifyRes.json();
    const verified =
      verifyData.data?.code === 100 || verifyData.data?.code === 101;

    if (verified) {
      const settleRef = String(verifyData.data?.ref_id ?? "");
      if (settleRef) await setOrderSettleRef(orderId, settleRef);
      const confirmed = await confirmPaidOrder(orderId);
      if (!confirmed.ok) {
        try {
          await refundOrderAtGateway(order);
        } catch {
          /* best-effort */
        }
        return NextResponse.json(
          {
            success: false,
            verified: false,
            message: "تأیید سفارش پس از پرداخت ناموفق بود",
          },
          { status: 409 },
        );
      }
      return NextResponse.json({
        success: true,
        verified: true,
        refId: settleRef || null,
        trackingCode: confirmed.order.trackingCode ?? null,
        message: confirmed.alreadyConfirmed
          ? "این سفارش قبلاً تأیید شده است"
          : "پرداخت تأیید شد",
      });
    }

    return NextResponse.json({
      success: false,
      verified: false,
      refId: null,
      trackingCode: order.trackingCode ?? null,
      message: "تأیید پرداخت ناموفق بود",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "خطا در تأیید پرداخت" },
      { status: 500 },
    );
  }
}
