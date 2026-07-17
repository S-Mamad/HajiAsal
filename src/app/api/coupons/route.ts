import { NextResponse } from "next/server";
import { z } from "zod";
import { validateCouponAsync, getActiveCouponsAsync } from "@/lib/server/coupons";

const couponSchema = z.object({
  code: z.string().min(1),
  subtotal: z.number().min(0),
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

    const result = await validateCouponAsync(parsed.data.code, parsed.data.subtotal);
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
      code: c.code,
      label: c.label,
      minOrder: c.minOrder,
    })),
  });
}
