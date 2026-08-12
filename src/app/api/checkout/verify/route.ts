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
  getZibalMerchant,
  isZibalVerifySuccess,
  zibalPostJson,
  zibalVerifyResultMessage,
  zibalVerifyUrl,
  type ZibalVerifyResult,
} from "@/lib/server/zibal";
import { notifyTelegram } from "@/lib/server/telegram-notify";

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

function alreadyPaidRedirect(orderId: string, tracking: string) {
  return successRedirect(orderId, tracking);
}

async function verifyAndConfirm(input: {
  orderId: string;
  trackId: string;
  order: NonNullable<Awaited<ReturnType<typeof getOrderById>>>;
}): Promise<
  | { ok: true; settleRef: string; tracking: string; alreadyConfirmed?: boolean }
  | { ok: false; reason: "verify" | "amount" | "confirm" }
> {
  const merchant = getZibalMerchant();
  if (!merchant) return { ok: false, reason: "verify" };

  const amountRial = Math.round(input.order.total * 10);
  const trackIdNum = Number(input.trackId);
  if (!Number.isFinite(trackIdNum)) {
    return { ok: false, reason: "verify" };
  }

  let verifyData: ZibalVerifyResult;
  try {
    verifyData = await zibalPostJson<ZibalVerifyResult>(zibalVerifyUrl(), {
      merchant,
      trackId: trackIdNum,
    });
  } catch {
    return { ok: false, reason: "verify" };
  }

  if (!isZibalVerifySuccess(Number(verifyData.result))) {
    return { ok: false, reason: "verify" };
  }

  // Fail-closed: amount must be present and match (coerce string/number from API).
  const paidAmount = Number(verifyData.amount);
  if (!Number.isFinite(paidAmount) || paidAmount !== amountRial) {
    return { ok: false, reason: "amount" };
  }

  const settleRef = String(verifyData.refNumber ?? "");
  if (settleRef) await setOrderSettleRef(input.orderId, settleRef);

  const confirmed = await confirmPaidOrder(input.orderId);
  if (!confirmed.ok) {
    try {
      await refundOrderAtGateway(input.order);
    } catch (error) {
      console.error(
        "[checkout/verify] auto-refund after confirm failure:",
        error instanceof Error ? error.message : error,
      );
    }
    return { ok: false, reason: "confirm" };
  }

  return {
    ok: true,
    settleRef,
    tracking: confirmed.order.trackingCode ?? "",
    alreadyConfirmed: confirmed.alreadyConfirmed,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const trackId = searchParams.get("trackId");
  const success = searchParams.get("success");
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

  if (!trackId || !orderId) {
    return failedRedirect(request.url);
  }

  if (success !== "1") {
    void notifyTelegram("order.payment_failed", {
      orderId,
      gateway: "zibal",
      reason: "cancelled",
    });
    return cancelledRedirect(orderId);
  }

  if (!getZibalMerchant()) {
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
      return alreadyPaidRedirect(orderId, order.trackingCode ?? "");
    }
    return failedRedirect(request.url, orderId);
  }

  // Auth via bound payment_ref (session optional — cookie may expire on gateway return).
  const refOk = await assertOrderPaymentRef(orderId, "zibal", trackId);
  if (!refOk) {
    return failedRedirect(request.url, orderId);
  }

  const result = await verifyAndConfirm({ orderId, trackId, order });
  if (result.ok) {
    return successRedirect(orderId, result.tracking, result.settleRef);
  }

  void notifyTelegram("order.payment_failed", {
    orderId,
    gateway: "zibal",
    reason: result.reason === "amount" ? "amount_mismatch" : "failed",
  });
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
    const trackId = String(body.trackId ?? body.authority ?? "");
    const orderId = body.orderId as string;

    if (!trackId || !orderId) {
      return NextResponse.json(
        { success: false, message: "اطلاعات تأیید نامعتبر است" },
        { status: 400 },
      );
    }

    if (!getZibalMerchant()) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          message: "درگاه زیبال پیکربندی نشده است",
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

    const refOk = await assertOrderPaymentRef(orderId, "zibal", trackId);
    if (!refOk) {
      return NextResponse.json(
        { success: false, message: "مرجع پرداخت با سفارش هم‌خوانی ندارد" },
        { status: 403 },
      );
    }

    const result = await verifyAndConfirm({ orderId, trackId, order });
    if (result.ok) {
      return NextResponse.json({
        success: true,
        verified: true,
        refId: result.settleRef || null,
        trackingCode: result.tracking || null,
        message: result.alreadyConfirmed
          ? "این سفارش قبلاً تأیید شده است"
          : "پرداخت تأیید شد",
      });
    }

    if (result.reason === "confirm") {
      void notifyTelegram("order.payment_failed", {
        orderId,
        gateway: "zibal",
        reason: "failed",
      });
      return NextResponse.json(
        {
          success: false,
          verified: false,
          message: "تأیید سفارش پس از پرداخت ناموفق بود",
        },
        { status: 409 },
      );
    }

    void notifyTelegram("order.payment_failed", {
      orderId,
      gateway: "zibal",
      reason: result.reason === "amount" ? "amount_mismatch" : "failed",
    });
    return NextResponse.json({
      success: false,
      verified: false,
      refId: null,
      trackingCode: order.trackingCode ?? null,
      message:
        result.reason === "amount"
          ? "مبلغ پرداخت با سفارش هم‌خوانی ندارد"
          : zibalVerifyResultMessage(202),
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "خطا در تأیید پرداخت" },
      { status: 500 },
    );
  }
}
