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
import { enqueueTelegramAlert } from "@/lib/server/telegram-alert-queue";
import type { GatewayRefundResult } from "@/lib/server/payment-refund";
import { consumeCartHoldsForSession } from "@/lib/server/cart-holds";
import { clientReplaceRedirect } from "@/lib/server/payment-return-redirect";

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
  return clientReplaceRedirect(
    new URL(`/checkout?${qs}`, siteUrl || requestUrl).toString(),
  );
}

function cancelledRedirect(orderId: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return clientReplaceRedirect(
    new URL(
      `/checkout?payment=cancelled&orderId=${encodeURIComponent(orderId)}`,
      siteUrl,
    ).toString(),
  );
}

function successRedirect(orderId: string, tracking: string, ref?: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const qs = new URLSearchParams({
    orderId,
    tracking,
  });
  if (ref) qs.set("ref", ref);
  return clientReplaceRedirect(
    new URL(`/checkout/success?${qs.toString()}`, siteUrl).toString(),
  );
}

function alreadyPaidRedirect(orderId: string, tracking: string) {
  return successRedirect(orderId, tracking);
}

async function verifyAndConfirm(input: {
  orderId: string;
  trackId: string;
  order: NonNullable<Awaited<ReturnType<typeof getOrderById>>>;
  request?: Request;
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
    let refund: GatewayRefundResult | null = null;
    try {
      refund = await refundOrderAtGateway(input.order);
    } catch (error) {
      console.error(
        "[checkout/verify] auto-refund after amount mismatch:",
        error instanceof Error ? error.message : error,
      );
    }
    if (!refund?.ok) {
      void enqueueTelegramAlert("api.error_critical", {
        route: "checkout/verify",
        message: `پرداخت زیبال با مبلغ ناسازگار؛ استرداد خودکار ناموفق (${refund?.error ?? "exception"}). orderId=${input.orderId} paid=${paidAmount} expected=${amountRial}`,
        orderId: input.orderId,
      });
    }
    return { ok: false, reason: "amount" };
  }

  const settleRef = String(verifyData.refNumber ?? "");
  if (settleRef) await setOrderSettleRef(input.orderId, settleRef);

  const confirmed = await confirmPaidOrder(input.orderId);
  if (confirmed.ok && input.request) {
    const cookie = input.request.headers.get("cookie") ?? "";
    const match = cookie.match(/(?:^|;\s*)hajiasal_cart_hold=([a-f0-9]{32})/i);
    if (match?.[1]) void consumeCartHoldsForSession(match[1]);
  }
  if (!confirmed.ok) {
    let refund: GatewayRefundResult | null = null;
    try {
      refund = await refundOrderAtGateway(input.order);
    } catch (error) {
      console.error(
        "[checkout/verify] auto-refund after confirm failure:",
        error instanceof Error ? error.message : error,
      );
    }
    // Zibal corporate refund is not wired — never pretend money was returned.
    if (!refund?.ok) {
      void enqueueTelegramAlert("api.error_critical", {
        route: "checkout/verify",
        message: `پرداخت زیبال موفق ولی confirm سفارش شکست؛ استرداد خودکار ناموفق (${refund?.error ?? "exception"}). orderId=${input.orderId} — از پنل زیبال دستی استرداد کنید.`,
        orderId: input.orderId,
      });
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
    const retryAfter = Math.max(3, limited.retryAfterSec ?? 5);
    const retryUrl = request.url;
    const html = `<!DOCTYPE html><html lang="fa"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta http-equiv="refresh" content="${retryAfter};url=${retryUrl.replace(/"/g, "&quot;")}"/><title>تأیید پرداخت</title></head><body dir="rtl" style="font-family:Tahoma,sans-serif;padding:2rem;text-align:center;background:#fafafa;color:#1c1917"><p>پرداخت شما در حال تأیید است. لطفاً این صفحه را نبندید.</p><p style="color:#78716c;font-size:0.9rem">تلاش مجدد تا ${retryAfter} ثانیه دیگر…</p><p><a href="${retryUrl.replace(/"/g, "&quot;")}">تأیید دوباره</a></p></body></html>`;
    return new NextResponse(html, {
      status: 429,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Retry-After": String(retryAfter),
        "Cache-Control": "no-store",
      },
    });
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
      const refOk = await assertOrderPaymentRef(orderId, "zibal", trackId);
      if (!refOk) {
        return failedRedirect(request.url, orderId);
      }
      return alreadyPaidRedirect(orderId, order.trackingCode ?? "");
    }
    return failedRedirect(request.url, orderId);
  }

  // Auth via bound payment_ref (session optional — cookie may expire on gateway return).
  const refOk = await assertOrderPaymentRef(orderId, "zibal", trackId);
  if (!refOk) {
    return failedRedirect(request.url, orderId);
  }

  const result = await verifyAndConfirm({ orderId, trackId, order, request });
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

    const result = await verifyAndConfirm({
      orderId,
      trackId,
      order,
      request,
    });
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
