import { NextResponse } from "next/server";
import { confirmPaidOrder, getOrderById } from "@/lib/server/orders";
import { getSessionFromRequest } from "@/lib/auth/session";
import { normalizePhone } from "@/lib/auth/phone";
import {
  isSnappayConfigured,
  verifyAndSettleSnappay,
} from "@/lib/server/snappay";
import {
  assertOrderPaymentRef,
  setOrderSettleRef,
} from "@/lib/server/payment-refs";
import { checkRateLimitAsync, getClientIp } from "@/lib/server/rate-limit";

const PAYABLE = new Set(["pending_payment"]);

function ownsOrder(
  order: NonNullable<Awaited<ReturnType<typeof getOrderById>>>,
  session: NonNullable<ReturnType<typeof getSessionFromRequest>>,
): boolean {
  return (
    order.userId === session.userId ||
    normalizePhone(order.customer.phone) === normalizePhone(session.phone)
  );
}

function failedRedirect(orderId?: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const qs = orderId
    ? `payment=failed&orderId=${encodeURIComponent(orderId)}`
    : "payment=failed";
  return NextResponse.redirect(new URL(`/checkout?${qs}`, siteUrl));
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
    return failedRedirect(orderId ?? undefined);
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
      return NextResponse.redirect(
        new URL(
          `/checkout/success?orderId=${encodeURIComponent(orderId)}&tracking=${encodeURIComponent(order.trackingCode ?? "")}`,
          siteUrl,
        ),
      );
    }
    return failedRedirect(orderId);
  }

  const session = getSessionFromRequest(request);
  if (!session || !ownsOrder(order, session)) {
    return failedRedirect(orderId);
  }

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
      return failedRedirect(orderId);
    }
    await setOrderSettleRef(orderId, paymentToken);
    const confirmed = await confirmPaidOrder(orderId);
    if (!confirmed.ok && confirmed.reason === "not_payable") {
      return failedRedirect(orderId);
    }
    const tracking =
      (confirmed.ok ? confirmed.order.trackingCode : order.trackingCode) ?? "";
    return NextResponse.redirect(
      new URL(
        `/checkout/success?orderId=${encodeURIComponent(orderId)}&tracking=${encodeURIComponent(tracking)}`,
        siteUrl,
      ),
    );
  } catch {
    return failedRedirect(orderId);
  }
}
