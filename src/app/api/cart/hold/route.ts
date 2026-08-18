import { NextResponse } from "next/server";
import { z } from "zod";
import { getProductByIdAsync } from "@/lib/server/products-store";
import {
  CART_HOLD_COOKIE,
  CART_HOLD_TTL_MS,
  consumeCartHoldsForSession,
  newCartHoldSessionId,
  releaseCartHoldsForSession,
  syncCartHolds,
} from "@/lib/server/cart-holds";
import { CART_MAX_QTY } from "@/lib/product-availability";
import {
  checkRateLimitAsync,
  getTrustedClientIp,
} from "@/lib/server/rate-limit";

const lineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(0).max(CART_MAX_QTY),
});

const bodySchema = z.object({
  items: z.array(lineSchema).max(50),
  release: z.boolean().optional(),
});

function readSessionId(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(
    new RegExp(`(?:^|;\\s*)${CART_HOLD_COOKIE}=([a-f0-9]{32})`, "i"),
  );
  return match?.[1] ?? null;
}

function withSessionCookie(response: NextResponse, sessionId: string) {
  response.cookies.set(CART_HOLD_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.ceil(CART_HOLD_TTL_MS / 1000) * 12,
  });
  return response;
}

export async function POST(request: Request) {
  const ip = getTrustedClientIp(request);
  const rl = await checkRateLimitAsync(
    `cart-hold:ip:${ip}`,
    30,
    CART_HOLD_TTL_MS,
  );
  if (!rl.ok) {
    return NextResponse.json(
      {
        success: false,
        message: "تعداد درخواست رزرو موجودی زیاد است. کمی بعد تلاش کنید.",
      },
      { status: 429 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "درخواست نامعتبر است" },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "اقلام سبد نامعتبر است" },
      { status: 400 },
    );
  }

  let sessionId = readSessionId(request);
  if (!sessionId) sessionId = newCartHoldSessionId();

  if (parsed.data.release || parsed.data.items.length === 0) {
    await releaseCartHoldsForSession(sessionId);
    const res = NextResponse.json({
      success: true,
      released: true,
      expiresAt: null,
      holds: [],
    });
    return withSessionCookie(res, sessionId);
  }

  const stockByProduct = new Map<string, number | null>();
  const uniqueIds = [...new Set(parsed.data.items.map((i) => i.productId))];
  await Promise.all(
    uniqueIds.map(async (id) => {
      const product = await getProductByIdAsync(id);
      stockByProduct.set(
        id,
        typeof product?.stockQty === "number" ? product.stockQty : null,
      );
    }),
  );

  const result = await syncCartHolds({
    sessionId,
    lines: parsed.data.items,
    stockByProduct,
  });

  const res = NextResponse.json({
    success: true,
    expiresAt: result.expiresAt,
    ttlMs: CART_HOLD_TTL_MS,
    holds: result.holds.map((h) => ({
      productId: h.productId,
      qty: h.qty,
      expiresAt: h.expiresAt,
    })),
    shortages: result.shortages,
  });
  return withSessionCookie(res, sessionId);
}

/** Used by checkout after free/paid confirm to drop holds without restoring. */
export async function DELETE(request: Request) {
  const sessionId = readSessionId(request);
  if (sessionId) await consumeCartHoldsForSession(sessionId);
  return NextResponse.json({ success: true });
}
