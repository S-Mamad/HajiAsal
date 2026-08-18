import { NextResponse } from "next/server";
import { z } from "zod";
import { validateCouponAsync, getActiveCouponsAsync } from "@/lib/server/coupons";
import { getProductByIdAsync } from "@/lib/server/products-store";
import { enqueueTelegramAlert } from "@/lib/server/telegram-alert-queue";
import { checkRateLimitAsync } from "@/lib/server/rate-limit";
import { getClientIp } from "@/lib/server/client-ip";
import { getSessionFromRequest } from "@/lib/auth/session";
import type { CouponNotifyPayload } from "@/lib/server/telegram-notify";

const couponSchema = z.object({
  code: z.string().min(1),
  subtotal: z.number().min(0),
  lineItems: z
    .array(
      z.object({
        productId: z.string().min(1),
        lineTotal: z.number().min(0),
      }),
    )
    .optional(),
});

/** Fire-and-forget: never awaited on the request path. */
function fireCouponTypedAlert(
  request: Request,
  payload: CouponNotifyPayload,
): void {
  void (async () => {
    try {
      const ip = getClientIp(request);
      const rl = await checkRateLimitAsync(`tg-coupon-ip:${ip}`, 40, 60_000);
      if (!rl.ok) return;
      const session = getSessionFromRequest(request);
      const event = payload.valid ? "coupon.applied" : "coupon.rejected";
      await enqueueTelegramAlert(event, {
        ...payload,
        source: "typed",
        phone: payload.phone ?? session?.phone,
      });
    } catch (error) {
      console.error(
        "[coupons] telegram alert",
        error instanceof Error ? error.message : error,
      );
    }
  })();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = couponSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { valid: false, message: "درخواست نامعتبر" },
        { status: 400 },
      );
    }

    const sellerIdsInCart: string[] = [];
    const sellerLineSubtotals: Record<string, number> = {};
    for (const line of parsed.data.lineItems ?? []) {
      const product = await getProductByIdAsync(line.productId);
      if (!product?.sellerId) continue;
      sellerIdsInCart.push(product.sellerId);
      sellerLineSubtotals[product.sellerId] =
        (sellerLineSubtotals[product.sellerId] ?? 0) + line.lineTotal;
    }

    const result = await validateCouponAsync(
      parsed.data.code,
      parsed.data.subtotal,
      { sellerIdsInCart, sellerLineSubtotals },
    );

    fireCouponTypedAlert(request, {
      code: parsed.data.code,
      valid: result.valid,
      discount: result.valid ? result.discount : undefined,
      message: result.valid ? undefined : result.message,
      subtotal: parsed.data.subtotal,
    });

    return NextResponse.json(result);
  } catch (error) {
    void enqueueTelegramAlert("api.error_critical", {
      route: "coupons",
      message: error instanceof Error ? error.message : "خطای سرور",
    });
    return NextResponse.json(
      { valid: false, message: "خطای سرور" },
      { status: 500 },
    );
  }
}

export async function GET() {
  const coupons = await getActiveCouponsAsync();
  return NextResponse.json({
    coupons: coupons.map((c) => ({
      label: c.label,
      minOrder: c.minOrder,
      type: c.type,
    })),
  });
}
