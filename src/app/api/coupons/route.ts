import { NextResponse } from "next/server";
import { z } from "zod";
import { validateCouponAsync, getActiveCouponsAsync } from "@/lib/server/coupons";
import { getProductByIdAsync } from "@/lib/server/products-store";

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
    return NextResponse.json(result);
  } catch {
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
