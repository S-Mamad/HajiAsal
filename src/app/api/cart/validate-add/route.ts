import { NextResponse } from "next/server";
import { z } from "zod";
import { getProductByIdAsync } from "@/lib/server/products-store";
import {
  isProductPurchasable,
  maxPurchasableQty,
} from "@/lib/product-availability";

const bodySchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(20).optional().default(1),
});

export async function POST(request: Request) {
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
      { success: false, message: "اطلاعات محصول نامعتبر است" },
      { status: 400 },
    );
  }

  const { productId, quantity } = parsed.data;
  const product = await getProductByIdAsync(productId);

  if (!product) {
    return NextResponse.json(
      { success: false, message: "محصول یافت نشد" },
      { status: 404 },
    );
  }

  if (!isProductPurchasable(product)) {
    return NextResponse.json(
      {
        success: false,
        message: `محصول «${product.title}» ناموجود است`,
        inStock: false,
        stockQty: product.stockQty ?? 0,
        maxQty: 0,
      },
      { status: 400 },
    );
  }

  const maxQty = maxPurchasableQty(product);
  if (quantity > maxQty) {
    return NextResponse.json(
      {
        success: false,
        message: `موجودی «${product.title}» کافی نیست (باقی‌مانده: ${maxQty})`,
        inStock: true,
        stockQty: product.stockQty,
        maxQty,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    inStock: true,
    stockQty: product.stockQty,
    maxQty,
    title: product.title,
  });
}
