import { NextResponse } from "next/server";
import { gateAdmin } from "@/lib/server/admin-gate";
import {
  deleteProductAsync,
  getProductByIdAsync,
  softDeleteProductAsync,
  updateProductAsync,
} from "@/lib/server/products-store";
import { productPatchSchema } from "@/lib/server/product-schemas";
import type { Product, ProductCategory, WeightOption } from "@/types";
import { logAdminAction } from "@/lib/server/audit-log";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const gate = await gateAdmin(request, "products.view");
  if (!gate.ok) return gate.response;

  const { id } = await context.params;
  const product = await getProductByIdAsync(id, { allowHidden: true });
  if (!product) {
    return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });
  }
  return NextResponse.json({ product });
}

export async function PATCH(request: Request, context: RouteContext) {
  const editGate = await gateAdmin(request, "products.edit");
  if (!editGate.ok) return editGate.response;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = productPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "اطلاعات نامعتبر است", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const isAutosave = Boolean(data.autosave);

    if (data.status === "active") {
      const pub = await gateAdmin(request, "products.publish");
      if (!pub.ok) return pub.response;
    }

    if (
      data.weightOptions !== undefined ||
      data.discountPrice !== undefined
    ) {
      const price = await gateAdmin(request, "products.edit_price");
      if (!price.ok) return price.response;
    }

    const { autosave, ...rest } = data;
    void autosave;
    const updates: Partial<Product> = {
      ...rest,
      category: rest.category as ProductCategory | undefined,
      weightOptions: rest.weightOptions as WeightOption[] | undefined,
      discountPrice:
        rest.discountPrice === null ? undefined : rest.discountPrice,
    };

    const product = await updateProductAsync(id, updates, {
      createRevision: !isAutosave,
      actor: editGate.ctx.user?.id ?? "admin",
      revisionNote: isAutosave ? "autosave" : "ویرایش دستی",
    });
    if (!product) {
      return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });
    }

    if (!isAutosave) {
      await logAdminAction({
        action: "product.update",
        entityType: "product",
        entityId: id,
        payload: rest,
        adminUserId: editGate.ctx.user?.id,
      });
    }

    return NextResponse.json({ success: true, product });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطای سرور";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const gate = await gateAdmin(request, "products.delete");
  if (!gate.ok) return gate.response;

  const { id } = await context.params;
  const url = new URL(request.url);
  const hard = url.searchParams.get("hard") === "1";

  const ok = hard
    ? await deleteProductAsync(id)
    : await softDeleteProductAsync(id);
  if (!ok) {
    return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });
  }

  await logAdminAction({
    action: hard ? "product.purge" : "product.trash",
    entityType: "product",
    entityId: id,
    adminUserId: gate.ctx.user?.id,
  });
  return NextResponse.json({ success: true });
}
