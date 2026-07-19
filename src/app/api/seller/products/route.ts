import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { gateSeller, clientIpFromRequest } from "@/lib/server/seller-gate";
import { getSellerProducts } from "@/lib/server/sellers";
import {
  createProductAsync,
  getProductByIdAsync,
  updateProductAsync,
  deleteProductAsync,
} from "@/lib/server/products-store";
import { logSellerActivity } from "@/lib/server/seller-activity";
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
  stockQty: z.number().int().min(0).optional(),
  status: z.enum(["active", "draft", "archived", "disabled"]).optional(),
  ingredients: z.string().max(1000).optional(),
  shippingInfo: z.string().max(1000).optional(),
  action: z.enum(["duplicate"]).optional(),
  productId: z.string().optional(),
});

const updateSchema = z.object({
  productId: z.string().min(1).optional(),
  productIds: z.array(z.string()).optional(),
  title: z.string().min(2).max(200).optional(),
  shortDescription: z.string().max(500).optional(),
  longDescription: z.string().max(5000).optional(),
  category: z.string().min(1).optional(),
  categoryLabel: z.string().optional(),
  images: z.array(z.string()).max(8).optional(),
  weightOptions: z.array(weightSchema).min(1).optional(),
  inStock: z.boolean().optional(),
  stockQty: z.number().int().min(0).optional(),
  status: z.enum(["active", "draft", "archived", "disabled"]).optional(),
  ingredients: z.string().max(1000).optional(),
  shippingInfo: z.string().max(1000).optional(),
  bulkStatus: z.enum(["active", "draft", "archived", "disabled"]).optional(),
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
  const gated = await gateSeller(request, "products.manage");
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

    if (parsed.data.action === "duplicate" && parsed.data.productId) {
      const existing = await getProductByIdAsync(parsed.data.productId, {
        allowHidden: true,
      });
      if (!existing || existing.sellerId !== gated.ctx.seller.id) {
        return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });
      }
      const now = new Date().toISOString();
      const id = `sp-${gated.ctx.seller.id}-${randomUUID().slice(0, 8)}`;
      const copy: Product = {
        ...existing,
        id,
        slug: `${existing.slug}-copy-${id.slice(-4)}`,
        title: `${existing.title} (کپی)`,
        approvalStatus: "pending",
        submittedAt: now,
        createdAt: now,
        status: "draft",
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

    const now = new Date().toISOString();
    const baseSlug =
      parsed.data.slug?.trim() ||
      slugify(parsed.data.title) ||
      `product-${Date.now()}`;
    const id = `sp-${gated.ctx.seller.id}-${randomUUID().slice(0, 8)}`;
    const slug = `${baseSlug}-${id.slice(-6)}`;
    const stockQty =
      parsed.data.stockQty ?? (parsed.data.inStock === false ? 0 : 1);

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
      inStock: stockQty > 0,
      stockQty,
      status: parsed.data.status ?? "active",
      rating: 0,
      reviewCount: 0,
      ingredients: parsed.data.ingredients,
      shippingInfo: parsed.data.shippingInfo,
      createdAt: now,
      sellerId: gated.ctx.seller.id,
      approvalStatus: parsed.data.status === "draft" ? "pending" : "pending",
      submittedAt: now,
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
      message: "محصول ثبت شد و در انتظار تأیید ادمین است",
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
      for (const id of parsed.data.productIds) {
        const existing = await getProductByIdAsync(id, { allowHidden: true });
        if (!existing || existing.sellerId !== gated.ctx.seller.id) continue;
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
      return NextResponse.json({ success: true, updated: updatedCount });
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

    const { productId, productIds: _ids, bulkStatus: _bulk, ...rest } =
      parsed.data;
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

    if (rest.stockQty !== undefined) {
      updates.inStock = rest.stockQty > 0;
    }

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

    await logSellerActivity({
      sellerId: gated.ctx.seller.id,
      action: "product.update",
      entityType: "product",
      entityId: productId,
      ip: clientIpFromRequest(request),
    });

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
    const ok = await deleteProductAsync(id);
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
