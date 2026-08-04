import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { gateSeller, gateSellerAny, clientIpFromRequest } from "@/lib/server/seller-gate";
import { getSellerProducts } from "@/lib/server/sellers";
import {
  createProductAsync,
  getProductByIdAsync,
  updateProductAsync,
  softDeleteProductAsync,
} from "@/lib/server/products-store";
import { logSellerActivity } from "@/lib/server/seller-activity";
import { canSellerPublishStatus } from "@/lib/product-approval";
import type { Product, ProductCategory } from "@/types";

const PRODUCT_CATEGORIES = [
  "mountain",
  "thyme",
  "multifloral",
  "royal-jelly",
  "honeycomb",
  "specialty",
  "gift-set",
  "distillates",
  "rice",
  "saffron",
] as const;

const categorySchema = z.enum(PRODUCT_CATEGORIES);

const weightSchema = z.object({
  label: z.string().min(1),
  grams: z.number().positive(),
  price: z.number().positive(),
});

const createProductSchema = z.object({
  title: z.string().min(2).max(200),
  slug: z.string().min(2).max(200).optional(),
  shortDescription: z.string().max(500).optional().default(""),
  longDescription: z.string().max(5000).optional().default(""),
  category: categorySchema,
  categoryLabel: z.string().optional().default(""),
  images: z.array(z.string().min(1)).max(8).optional().default([]),
  weightOptions: z.array(weightSchema).min(1),
  inStock: z.boolean().optional().default(true),
  stockQty: z.number().int().min(0).optional(),
  status: z.enum(["active", "draft", "archived", "disabled"]).optional(),
  ingredients: z.string().max(1000).optional(),
  shippingInfo: z.string().max(1000).optional(),
});

const duplicateSchema = z.object({
  action: z.literal("duplicate"),
  productId: z.string().min(1),
});

const createSchema = z.union([duplicateSchema, createProductSchema]);

const updateSchema = z.object({
  productId: z.string().min(1).optional(),
  productIds: z.array(z.string()).optional(),
  title: z.string().min(2).max(200).optional(),
  shortDescription: z.string().max(500).optional(),
  longDescription: z.string().max(5000).optional(),
  category: categorySchema.optional(),
  categoryLabel: z.string().optional(),
  images: z.array(z.string().min(1)).max(8).optional(),
  weightOptions: z.array(weightSchema).min(1).optional(),
  inStock: z.boolean().optional(),
  stockQty: z.number().int().min(0).optional(),
  status: z.enum(["active", "draft", "archived", "disabled"]).optional(),
  ingredients: z.string().max(1000).optional(),
  shippingInfo: z.string().max(1000).optional(),
  bulkStatus: z.enum(["active", "draft", "archived", "disabled"]).optional(),
  /** Submit a local draft into the admin review queue */
  submitForReview: z.boolean().optional(),
});

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function sellerContentChanged(
  existing: Product,
  rest: {
    title?: string;
    shortDescription?: string;
    longDescription?: string;
    category?: string;
    categoryLabel?: string;
    images?: string[];
    weightOptions?: Product["weightOptions"];
    ingredients?: string;
    shippingInfo?: string;
  },
): boolean {
  if (rest.title !== undefined && rest.title !== existing.title) return true;
  if (
    rest.shortDescription !== undefined &&
    rest.shortDescription !== (existing.shortDescription ?? "")
  ) {
    return true;
  }
  if (
    rest.longDescription !== undefined &&
    rest.longDescription !== (existing.longDescription ?? "")
  ) {
    return true;
  }
  if (rest.category !== undefined && rest.category !== existing.category) {
    return true;
  }
  if (
    rest.categoryLabel !== undefined &&
    rest.categoryLabel !== (existing.categoryLabel ?? "")
  ) {
    return true;
  }
  if (rest.images !== undefined && !sameJson(rest.images, existing.images ?? [])) {
    return true;
  }
  if (
    rest.weightOptions !== undefined &&
    !sameJson(rest.weightOptions, existing.weightOptions)
  ) {
    return true;
  }
  if (
    rest.ingredients !== undefined &&
    rest.ingredients !== (existing.ingredients ?? "")
  ) {
    return true;
  }
  if (
    rest.shippingInfo !== undefined &&
    rest.shippingInfo !== (existing.shippingInfo ?? "")
  ) {
    return true;
  }
  return false;
}
function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function GET(request: Request) {
  const gated = await gateSellerAny(request, [
    "products.manage",
    "print.export",
  ]);
  if (!gated.ok) return gated.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const products = await getSellerProducts(gated.ctx.seller.id);
  if (id) {
    const product = products.find((p) => p.id === id);
    if (!product) {
      return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });
    }
    return NextResponse.json({ product });
  }
  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  const gated = await gateSeller(request, "products.manage");
  if (!gated.ok) return gated.response;

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "اطلاعات محصول نامعتبر است" }, { status: 400 });
    }

    if ("action" in parsed.data && parsed.data.action === "duplicate") {
      const existing = await getProductByIdAsync(parsed.data.productId, {
        allowHidden: true,
      });
      if (!existing || existing.sellerId !== gated.ctx.seller.id) {
        return NextResponse.json(
          {
            error: existing && !existing.sellerId
              ? "محصول کاتالوگ اختصاصی قابل کپی نیست"
              : "محصول یافت نشد",
          },
          { status: 404 },
        );
      }
      const now = new Date().toISOString();
      const id = `sp-${gated.ctx.seller.id}-${randomUUID().slice(0, 8)}`;
      const copy: Product = {
        ...existing,
        id,
        slug: `${existing.slug}-copy-${id.slice(-4)}`,
        title: `${existing.title} (کپی)`,
        approvalStatus: "pending",
        submittedAt: undefined,
        reviewedAt: undefined,
        reviewNote: undefined,
        createdAt: now,
        status: "draft",
        sellerId: gated.ctx.seller.id,
      };
      const created = await createProductAsync(copy);
      if (!created) {
        return NextResponse.json({ error: "کپی ناموفق" }, { status: 500 });
      }
      await logSellerActivity({
        sellerId: gated.ctx.seller.id,
        action: "product.duplicate",
        entityType: "product",
        entityId: id,
        ip: clientIpFromRequest(request),
      });
      return NextResponse.json({ success: true, product: created });
    }

    const data = parsed.data as z.infer<typeof createProductSchema>;
    const now = new Date().toISOString();
    const baseSlug =
      data.slug?.trim() ||
      slugify(data.title) ||
      `product-${Date.now()}`;
    const id = `sp-${gated.ctx.seller.id}-${randomUUID().slice(0, 8)}`;
    const slug = `${baseSlug}-${id.slice(-6)}`;
    const stockQty =
      data.stockQty ?? (data.inStock === false ? 0 : 1);
    // Seller cannot publish directly; "active" from the form means "submit for review".
    const submitForReview = data.status !== "draft";

    const product: Product = {
      id,
      slug,
      title: data.title.trim(),
      shortDescription: data.shortDescription ?? "",
      longDescription: data.longDescription ?? "",
      category: data.category as ProductCategory,
      categoryLabel:
        data.categoryLabel?.trim() || data.category,
      images: data.images ?? [],
      weightOptions: data.weightOptions,
      inStock: stockQty > 0,
      stockQty,
      status: "draft",
      rating: 0,
      reviewCount: 0,
      ingredients: data.ingredients,
      shippingInfo: data.shippingInfo,
      createdAt: now,
      sellerId: gated.ctx.seller.id,
      approvalStatus: "pending",
      submittedAt: submitForReview ? now : undefined,
    };

    const created = await createProductAsync(product);
    if (!created) {
      return NextResponse.json({ error: "ایجاد محصول ممکن نشد" }, { status: 500 });
    }

    await logSellerActivity({
      sellerId: gated.ctx.seller.id,
      action: "product.create",
      entityType: "product",
      entityId: id,
      ip: clientIpFromRequest(request),
    });

    return NextResponse.json({
      success: true,
      product: created,
      message: submitForReview
        ? "محصول ثبت شد و در انتظار تأیید ادمین است"
        : "پیش‌نویس ذخیره شد",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطای سرور";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const gated = await gateSeller(request, "products.manage");
  if (!gated.ok) return gated.response;

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
    }

    // Bulk status change
    if (parsed.data.bulkStatus && parsed.data.productIds?.length) {
      let updatedCount = 0;
      let skipped = 0;
      for (const id of parsed.data.productIds) {
        const existing = await getProductByIdAsync(id, { allowHidden: true });
        if (!existing || existing.sellerId !== gated.ctx.seller.id) continue;
        if (existing.deletedAt) {
          skipped += 1;
          continue;
        }
        if (
          parsed.data.bulkStatus === "active" &&
          !canSellerPublishStatus(existing.approvalStatus)
        ) {
          skipped += 1;
          continue;
        }
        const product = await updateProductAsync(id, {
          status: parsed.data.bulkStatus,
        });
        if (product) {
          updatedCount += 1;
          await logSellerActivity({
            sellerId: gated.ctx.seller.id,
            action: "product.bulk_status",
            entityType: "product",
            entityId: id,
            meta: { status: parsed.data.bulkStatus },
            ip: clientIpFromRequest(request),
          });
        }
      }
      return NextResponse.json({
        success: true,
        updated: updatedCount,
        skipped,
        message:
          skipped > 0
            ? `${updatedCount} به‌روز شد؛ ${skipped} محصول هنوز تأیید نشده و فعال نشد`
            : undefined,
      });
    }

    if (!parsed.data.productId) {
      return NextResponse.json({ error: "productId لازم است" }, { status: 400 });
    }

    const existing = await getProductByIdAsync(parsed.data.productId, {
      allowHidden: true,
    });
    if (!existing || existing.sellerId !== gated.ctx.seller.id) {
      return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });
    }
    if (existing.deletedAt) {
      return NextResponse.json(
        { error: "محصول حذف‌شده قابل ویرایش نیست" },
        { status: 410 },
      );
    }

    const {
      productId,
      productIds: _ids,
      bulkStatus: _bulk,
      submitForReview,
      ...rest
    } = parsed.data;

    if (
      rest.status === "active" &&
      !canSellerPublishStatus(existing.approvalStatus) &&
      !submitForReview
    ) {
      return NextResponse.json(
        {
          error:
            "تا قبل از تأیید ادمین نمی‌توانید محصول را فعال کنید. ابتدا برای تأیید ارسال کنید.",
        },
        { status: 400 },
      );
    }

    const contentChanged = sellerContentChanged(existing, rest);

    const updates: Partial<Product> = {
      ...rest,
      category: rest.category
        ? (rest.category as ProductCategory)
        : undefined,
    };

    if (rest.stockQty !== undefined) {
      updates.inStock = rest.stockQty > 0;
    }

    if (submitForReview) {
      updates.status = "draft";
      updates.approvalStatus = "pending";
      updates.submittedAt = new Date().toISOString();
      updates.reviewedAt = undefined;
      updates.reviewNote = undefined;
    } else if (contentChanged) {
      const wasSubmitted = Boolean(existing.submittedAt);
      const wasApproved = existing.approvalStatus === "approved";
      updates.approvalStatus = "pending";
      updates.status = "draft";
      // Keep local-only drafts out of the admin queue until explicitly submitted.
      // Already-approved or previously submitted products re-enter the queue.
      updates.submittedAt =
        wasSubmitted || wasApproved ? new Date().toISOString() : undefined;
      updates.reviewedAt = undefined;
      updates.reviewNote = undefined;
    }

    const product = await updateProductAsync(productId, updates);
    if (!product) {
      return NextResponse.json({ error: "به‌روزرسانی ناموفق بود" }, { status: 500 });
    }

    await logSellerActivity({
      sellerId: gated.ctx.seller.id,
      action: submitForReview ? "product.submit" : "product.update",
      entityType: "product",
      entityId: productId,
      ip: clientIpFromRequest(request),
    });

    return NextResponse.json({
      success: true,
      product,
      message: submitForReview
        ? "محصول برای تأیید ادمین ارسال شد"
        : contentChanged && product.submittedAt
          ? "تغییرات ثبت شد و دوباره در انتظار تأیید ادمین است"
          : "به‌روزرسانی شد",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطای سرور";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const deleteSchema = z.object({
  productId: z.string().min(1).optional(),
  productIds: z.array(z.string()).optional(),
});

export async function DELETE(request: Request) {
  const gated = await gateSeller(request, "products.manage");
  if (!gated.ok) return gated.response;

  const body = await request.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "نامعتبر" }, { status: 400 });
  }

  const ids =
    parsed.data.productIds ??
    (parsed.data.productId ? [parsed.data.productId] : []);
  if (!ids.length) {
    return NextResponse.json({ error: "شناسه لازم است" }, { status: 400 });
  }

  let deleted = 0;
  for (const id of ids) {
    const existing = await getProductByIdAsync(id, { allowHidden: true });
    if (!existing || existing.sellerId !== gated.ctx.seller.id) continue;
    if (existing.deletedAt) continue;
    const ok = await softDeleteProductAsync(id);
    if (ok) {
      deleted += 1;
      await logSellerActivity({
        sellerId: gated.ctx.seller.id,
        action: "product.delete",
        entityType: "product",
        entityId: id,
        ip: clientIpFromRequest(request),
      });
    }
  }

  return NextResponse.json({ success: true, deleted });
}
