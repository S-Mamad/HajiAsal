import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequestAuthenticatedAsync } from "@/lib/server/admin";
import {
  deleteProductAsync,
  getProductByIdAsync,
  updateProductAsync,
} from "@/lib/server/products-store";
import type { Product, ProductCategory, WeightOption } from "@/types";
import { logAdminAction } from "@/lib/server/audit-log";

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  shortDescription: z.string().optional(),
  longDescription: z.string().optional(),
  category: z.string().optional(),
  categoryLabel: z.string().optional(),
  images: z.array(z.string()).optional(),
  weightOptions: z
    .array(
      z.object({
        label: z.string(),
        grams: z.number(),
        price: z.number(),
      }),
    )
    .optional(),
  discountPrice: z.number().optional(),
  inStock: z.boolean().optional(),
  isBestseller: z.boolean().optional(),
  isNew: z.boolean().optional(),
  ingredients: z.string().optional(),
  shippingInfo: z.string().optional(),
  rating: z.number().optional(),
  reviewCount: z.number().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  if (!(await isAdminRequestAuthenticatedAsync(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const { id } = await context.params;
  // Admin must see pending/rejected seller products (public visibility hides them).
  const product = await getProductByIdAsync(id, { allowHidden: true });

  if (!product) {
    return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });
  }

  return NextResponse.json({ product });
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAdminRequestAuthenticatedAsync(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "اطلاعات نامعتبر است" },
        { status: 400 },
      );
    }

    const updates: Partial<Product> = {
      ...parsed.data,
      category: parsed.data.category as ProductCategory | undefined,
      weightOptions: parsed.data.weightOptions as WeightOption[] | undefined,
    };

    const product = await updateProductAsync(id, updates);
    if (!product) {
      return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });
    }

    await logAdminAction({
      action: "product.update",
      entityType: "product",
      entityId: id,
      payload: parsed.data,
    });

    return NextResponse.json({ success: true, product });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "خطای سرور";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!(await isAdminRequestAuthenticatedAsync(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const { id } = await context.params;
  const ok = await deleteProductAsync(id);
  if (!ok) {
    return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });
  }
  await logAdminAction({
    action: "product.delete",
    entityType: "product",
    entityId: id,
  });
  return NextResponse.json({ success: true });
}
