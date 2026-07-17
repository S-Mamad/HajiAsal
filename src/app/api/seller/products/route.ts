import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  getSellerFromRequest,
  getSellerProducts,
} from "@/lib/server/sellers";
import {
  createProductAsync,
  getProductByIdAsync,
  updateProductAsync,
} from "@/lib/server/products-store";
import type { Product, ProductCategory } from "@/types";

const weightSchema = z.object({
  label: z.string().min(1),
  grams: z.number().positive(),
  price: z.number().positive(),
});

const createSchema = z.object({
  title: z.string().min(2).max(200),
  slug: z.string().min(2).max(200).optional(),
  shortDescription: z.string().max(500).optional().default(""),
  longDescription: z.string().max(5000).optional().default(""),
  category: z.string().min(1),
  categoryLabel: z.string().optional().default(""),
  images: z.array(z.string().min(1)).max(8).optional().default([]),
  weightOptions: z.array(weightSchema).min(1),
  inStock: z.boolean().optional().default(true),
  ingredients: z.string().max(1000).optional(),
  shippingInfo: z.string().max(1000).optional(),
});

const updateSchema = z.object({
  productId: z.string().min(1),
  title: z.string().min(2).max(200).optional(),
  shortDescription: z.string().max(500).optional(),
  longDescription: z.string().max(5000).optional(),
  category: z.string().min(1).optional(),
  categoryLabel: z.string().optional(),
  images: z.array(z.string()).max(8).optional(),
  weightOptions: z.array(weightSchema).min(1).optional(),
  inStock: z.boolean().optional(),
  ingredients: z.string().max(1000).optional(),
  shippingInfo: z.string().max(1000).optional(),
});

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function GET(request: Request) {
  const seller = await getSellerFromRequest(request);
  if (!seller) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const products = await getSellerProducts(seller.id);
  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  const seller = await getSellerFromRequest(request);
  if (!seller) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "اطلاعات محصول نامعتبر است" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const baseSlug =
      parsed.data.slug?.trim() ||
      slugify(parsed.data.title) ||
      `product-${Date.now()}`;
    const id = `sp-${seller.id}-${randomUUID().slice(0, 8)}`;
    const slug = `${baseSlug}-${id.slice(-6)}`;

    const product: Product = {
      id,
      slug,
      title: parsed.data.title.trim(),
      shortDescription: parsed.data.shortDescription ?? "",
      longDescription: parsed.data.longDescription ?? "",
      category: parsed.data.category as ProductCategory,
      categoryLabel:
        parsed.data.categoryLabel?.trim() || parsed.data.category,
      images: parsed.data.images ?? [],
      weightOptions: parsed.data.weightOptions,
      inStock: parsed.data.inStock ?? true,
      rating: 0,
      reviewCount: 0,
      ingredients: parsed.data.ingredients,
      shippingInfo: parsed.data.shippingInfo,
      createdAt: now,
      sellerId: seller.id,
      approvalStatus: "pending",
      submittedAt: now,
    };

    const created = await createProductAsync(product);
    if (!created) {
      return NextResponse.json(
        { error: "ایجاد محصول ممکن نشد" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      product: created,
      message: "محصول ثبت شد و در انتظار تأیید ادمین است",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطای سرور";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const seller = await getSellerFromRequest(request);
  if (!seller) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
    }

    const existing = await getProductByIdAsync(parsed.data.productId, {
      allowHidden: true,
    });
    if (!existing || existing.sellerId !== seller.id) {
      return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });
    }

    const { productId, ...rest } = parsed.data;
    const contentChanged =
      rest.title !== undefined ||
      rest.shortDescription !== undefined ||
      rest.longDescription !== undefined ||
      rest.category !== undefined ||
      rest.images !== undefined ||
      rest.weightOptions !== undefined ||
      rest.ingredients !== undefined ||
      rest.shippingInfo !== undefined;

    const updates: Partial<Product> = {
      ...rest,
      category: rest.category
        ? (rest.category as ProductCategory)
        : undefined,
    };

    // Content edits require fresh admin approval
    if (contentChanged) {
      updates.approvalStatus = "pending";
      updates.submittedAt = new Date().toISOString();
      updates.reviewedAt = undefined;
      updates.reviewNote = undefined;
    }

    const product = await updateProductAsync(productId, updates);
    if (!product) {
      return NextResponse.json({ error: "به‌روزرسانی ناموفق بود" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      product,
      message: contentChanged
        ? "تغییرات ثبت شد و دوباره در انتظار تأیید ادمین است"
        : "به‌روزرسانی شد",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطای سرور";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
