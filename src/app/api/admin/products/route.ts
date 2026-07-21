import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { gateAdmin } from "@/lib/server/admin-gate";
import {
  getAllProductsAsync,
  createProductAsync,
} from "@/lib/server/products-store";
import { productCreateSchema } from "@/lib/server/product-schemas";
import type { Product, ProductCategory } from "@/types";
import { logAdminAction } from "@/lib/server/audit-log";

export async function GET(request: Request) {
  const gate = await gateAdmin(request, "products.view");
  if (!gate.ok) return gate.response;

  const url = new URL(request.url);
  const trash = url.searchParams.get("trash") === "1";
  const status = url.searchParams.get("status") as
    | "active"
    | "draft"
    | "archived"
    | "disabled"
    | "all"
    | null;

  const products = await getAllProductsAsync({
    scope: "admin",
    includeTrash: trash,
    status: status ?? "all",
  });
  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  const gate = await gateAdmin(request, "products.create");
  if (!gate.ok) return gate.response;

  try {
    const body = await request.json();
    const parsed = productCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "اطلاعات نامعتبر است", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (parsed.data.status === "active") {
      const pub = await gateAdmin(request, "products.publish");
      if (!pub.ok) return pub.response;
    }

    const data = parsed.data;
    const product: Product = {
      id: data.id ?? `p_${randomUUID().slice(0, 8)}`,
      slug: data.slug,
      title: data.title,
      shortDescription: data.shortDescription,
      longDescription: data.longDescription,
      category: data.category as ProductCategory,
      categoryLabel: data.categoryLabel || data.category,
      images: data.images,
      weightOptions: data.weightOptions,
      discountPrice: data.discountPrice,
      inStock: data.inStock,
      stockQty: data.stockQty,
      isBestseller: data.isBestseller,
      isNew: data.isNew,
      ingredients: data.ingredients,
      shippingInfo: data.shippingInfo,
      rating: data.rating,
      reviewCount: data.reviewCount,
      status: data.status,
      sku: data.sku,
      brandId: data.brandId,
      seo: data.seo,
      customFields: data.customFields ?? {},
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
      adminUserId: gate.ctx.user?.id,
    });

    return NextResponse.json({ success: true, product: created });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطای سرور";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
