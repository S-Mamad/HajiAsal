import { NextResponse } from "next/server";
import { confirmPaidOrder, getOrderById } from "@/lib/server/orders";
import {
  isSnappayConfigured,
  verifyAndSettleSnappay,
} from "@/lib/server/snappay";
import {
  assertOrderPaymentRef,
  setOrderSettleRef,
} from "@/lib/server/payment-refs";
import { checkRateLimitAsync, getClientIp } from "@/lib/server/rate-limit";
import { refundOrderAtGateway } from "@/lib/server/payment-refund";
import { notifyTelegram } from "@/lib/server/telegram-notify";
import { enqueueTelegramAlert } from "@/lib/server/telegram-alert-queue";
import type { GatewayRefundResult } from "@/lib/server/payment-refund";
import { clientReplaceRedirect } from "@/lib/server/payment-return-redirect";

const PAYABLE = new Set(["pending_payment"]);

function failedRedirect(orderId?: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const qs = orderId
    ? `payment=failed&orderId=${encodeURIComponent(orderId)}`
    : "payment=failed";
  return clientReplaceRedirect(new URL(`/checkout?${qs}`, siteUrl).toString());
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");
  const paymentToken =
    searchParams.get("paymentToken") ??
    searchParams.get("token") ??
    searchParams.get("payment_token");
  const state = (searchParams.get("state") ?? searchParams.get("status") ?? "")
    .toLowerCase();

  const ip = getClientIp(request);
  const limited = await checkRateLimitAsync(
    `snappay-verify:${ip}`,
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

  if (!orderId) {
    return failedRedirect();
  }

  if (
    state === "failed" ||
    state === "cancel" ||
    state === "cancelled" ||
    state === "reject"
  ) {
    void notifyTelegram("order.payment_failed", {
      orderId,
      gateway: "snappay",
      reason: "cancelled",
    });
    return cancelledRedirect(orderId);
  }

  if (!paymentToken || !isSnappayConfigured()) {
    return failedRedirect(orderId);
  }

  const order = await getOrderById(orderId);
  if (!order) {
    return failedRedirect();
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  if (!PAYABLE.has(order.status)) {
    if (
      order.status === "confirmed" ||
      order.status === "processing" ||
      order.status === "shipped" ||
      order.status === "delivered"
    ) {
      const refOk = await assertOrderPaymentRef(
        orderId,
        "snappay",
        paymentToken,
      );
      if (!refOk) {
        return failedRedirect(orderId);
      }
      return clientReplaceRedirect(
        new URL(
          `/checkout/success?orderId=${encodeURIComponent(orderId)}&tracking=${encodeURIComponent(order.trackingCode ?? "")}`,
          siteUrl,
        ).toString(),
      );
    }
    return failedRedirect(orderId);
  }

  // Auth via bound payment token (session optional on gateway return).
  const refOk = await assertOrderPaymentRef(orderId, "snappay", paymentToken);
  if (!refOk) {
    return failedRedirect(orderId);
  }

  try {
    const expectedRial = Math.round(order.total * 10);
    const result = await verifyAndSettleSnappay(paymentToken, {
      expectedAmountRial: expectedRial,
    });
    if (!result.ok) {
      void notifyTelegram("order.payment_failed", {
        orderId,
        gateway: "snappay",
        reason: "failed",
      });
      return failedRedirect(orderId);
    }
    await setOrderSettleRef(orderId, paymentToken);
    const confirmed = await confirmPaidOrder(orderId);
    if (!confirmed.ok) {
      let refund: GatewayRefundResult | null = null;
      try {
        refund = await refundOrderAtGateway(order);
      } catch (error) {
        console.error(
          "[snappay/verify] auto-refund after confirm failure:",
          error instanceof Error ? error.message : error,
        );
      }
      if (!refund?.ok) {
        void enqueueTelegramAlert("api.error_critical", {
          route: "checkout/snappay/verify",
          message: `پرداخت اسنپ‌پی موفق ولی confirm سفارش شکست؛ استرداد خودکار ناموفق (${refund?.error ?? "exception"}). orderId=${orderId}`,
          orderId,
        });
      }
      return failedRedirect(orderId);
    }
    const tracking = confirmed.order.trackingCode ?? "";
    return clientReplaceRedirect(
      new URL(
        `/checkout/success?orderId=${encodeURIComponent(orderId)}&tracking=${encodeURIComponent(tracking)}`,
        siteUrl,
      ).toString(),
    );
  } catch {
    void notifyTelegram("order.payment_failed", {
      orderId,
      gateway: "snappay",
      reason: "failed",
    });
    return failedRedirect(orderId);
  }
}
