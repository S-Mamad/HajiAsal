import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequestAuthenticatedAsync } from "@/lib/server/admin";
import {
  getAllProductsAsync,
  createProductAsync,
} from "@/lib/server/products-store";
import type { Product, ProductCategory } from "@/types";
import { logAdminAction } from "@/lib/server/audit-log";

const createSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  shortDescription: z.string().default(""),
  longDescription: z.string().default(""),
  category: z.string(),
  categoryLabel: z.string().default(""),
  images: z.array(z.string()).default([]),
  weightOptions: z
    .array(
      z.object({
        label: z.string(),
        grams: z.number(),
        price: z.number(),
      }),
    )
    .min(1),
  inStock: z.boolean().default(true),
  rating: z.number().default(0),
  reviewCount: z.number().default(0),
});

export async function GET(request: Request) {
  if (!(await isAdminRequestAuthenticatedAsync(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const products = await getAllProductsAsync({ scope: "admin" });
  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  if (!(await isAdminRequestAuthenticatedAsync(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "اطلاعات نامعتبر است" },
        { status: 400 },
      );
    }

    const product: Product = {
      ...parsed.data,
      category: parsed.data.category as ProductCategory,
      createdAt: new Date().toISOString().split("T")[0],
    };

    const created = await createProductAsync(product);
    if (!created) {
      return NextResponse.json({ error: "خطا در ایجاد محصول" }, { status: 500 });
    }

    await logAdminAction({
      action: "product.create",
      entityType: "product",
      entityId: created.id,
    });

    return NextResponse.json({ success: true, product: created });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطای سرور";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
