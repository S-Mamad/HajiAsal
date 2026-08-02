import { NextResponse } from "next/server";
import { getOrderById, updateOrderStatus } from "@/lib/server/orders";
import {
  isSnappayConfigured,
  verifyAndSettleSnappay,
} from "@/lib/server/snappay";

const PAYABLE = new Set(["pending_payment"]);

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
    if (order.status === "confirmed" || order.status === "processing") {
      return NextResponse.redirect(
        new URL(
          `/checkout/success?orderId=${encodeURIComponent(orderId)}&tracking=${encodeURIComponent(order.trackingCode ?? "")}`,
          siteUrl,
        ),
      );
    }
    return failedRedirect(orderId);
  }

  try {
    const result = await verifyAndSettleSnappay(paymentToken);
    if (!result.ok) {
      return failedRedirect(orderId);
    }
    await updateOrderStatus(orderId, "confirmed");
    return NextResponse.redirect(
      new URL(
        `/checkout/success?orderId=${encodeURIComponent(orderId)}&tracking=${encodeURIComponent(order.trackingCode ?? "")}`,
        siteUrl,
      ),
    );
  } catch {
    return failedRedirect(orderId);
  }
}
