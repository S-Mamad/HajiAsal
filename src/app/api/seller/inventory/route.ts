import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getSellerFromRequest,
  getSellerProducts,
  setSellerProductStock,
} from "@/lib/server/sellers";

const patchSchema = z.object({
  productId: z.string().min(1),
  inStock: z.boolean(),
});

export async function GET(request: Request) {
  const seller = await getSellerFromRequest(request);
  if (!seller) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const products = await getSellerProducts(seller.id);
  return NextResponse.json({
    products,
    outOfStock: products.filter((p) => !p.inStock).length,
  });
}

export async function PATCH(request: Request) {
  const seller = await getSellerFromRequest(request);
  if (!seller) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
    }

    const updated = await setSellerProductStock(
      seller.id,
      parsed.data.productId,
      parsed.data.inStock,
    );
    if (!updated) {
      return NextResponse.json(
        { error: "محصول متعلق به این فروشنده نیست" },
        { status: 403 },
      );
    }

    return NextResponse.json({ success: true, product: updated });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "خطا در به‌روزرسانی",
      },
      { status: 500 },
    );
  }
}
