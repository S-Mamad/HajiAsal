import { NextResponse } from "next/server";
import { GENERAL_REVIEW_PRODUCT_ID } from "@/lib/review-constants";
import {
  hasPurchasedByPhone,
  hasPurchasedProductByPhone,
} from "@/lib/server/orders";
import { normalizePhone } from "@/lib/auth/phone";
import { getSessionFromRequest } from "@/lib/auth/session";

export type ReviewEligibilityReason = "login" | "purchase" | "ok";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId")?.trim() || "";

  if (!productId) {
    return NextResponse.json(
      { canReview: false, reason: "purchase" as ReviewEligibilityReason },
      { status: 400 },
    );
  }

  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({
      canReview: false,
      reason: "login" as ReviewEligibilityReason,
    });
  }

  const phone = normalizePhone(session.phone);
  if (!phone) {
    return NextResponse.json({
      canReview: false,
      reason: "purchase" as ReviewEligibilityReason,
    });
  }

  const canReview =
    productId === GENERAL_REVIEW_PRODUCT_ID
      ? await hasPurchasedByPhone(phone)
      : await hasPurchasedProductByPhone(phone, productId);

  return NextResponse.json({
    canReview,
    reason: (canReview ? "ok" : "purchase") as ReviewEligibilityReason,
  });
}
