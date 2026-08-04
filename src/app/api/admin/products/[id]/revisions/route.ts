import { NextResponse } from "next/server";
import { z } from "zod";
import { gateAdmin } from "@/lib/server/admin-gate";
import {
  getProductByIdAsync,
  listProductRevisionsAsync,
  restoreProductRevisionAsync,
} from "@/lib/server/products-store";
import { logAdminAction } from "@/lib/server/audit-log";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const gate = await gateAdmin(request, "products.view");
  if (!gate.ok) return gate.response;

  const { id } = await context.params;
  const revisions = await listProductRevisionsAsync(id);
  return NextResponse.json({ revisions });
}

const restoreSchema = z.object({
  revisionId: z.string().min(1),
});

export async function POST(request: Request, context: RouteContext) {
  const gate = await gateAdmin(request, "products.edit");
  if (!gate.ok) return gate.response;

  const { id } = await context.params;
  const body = await request.json();
  const parsed = restoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
  }

  const revisions = await listProductRevisionsAsync(id);
  const rev = revisions.find((r) => r.id === parsed.data.revisionId);
  if (!rev?.snapshot) {
    return NextResponse.json({ error: "نسخه یافت نشد" }, { status: 404 });
  }

  const existing = await getProductByIdAsync(id, { allowHidden: true });
  if (!existing) {
    return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });
  }

  const snap = rev.snapshot;
  if (
    snap.status === "active" &&
    (existing.status ?? "active") !== "active"
  ) {
    const pub = await gateAdmin(request, "products.publish");
    if (!pub.ok) return pub.response;
  }

  const priceChanged =
    JSON.stringify(snap.weightOptions ?? null) !==
      JSON.stringify(existing.weightOptions ?? null) ||
    snap.discountPrice !== existing.discountPrice;
  if (priceChanged) {
    const price = await gateAdmin(request, "products.edit_price");
    if (!price.ok) return price.response;
  }

  const product = await restoreProductRevisionAsync(
    id,
    parsed.data.revisionId,
  );
  if (!product) {
    return NextResponse.json({ error: "نسخه یافت نشد" }, { status: 404 });
  }

  await logAdminAction({
    action: "product.revision_restore",
    entityType: "product",
    entityId: id,
    payload: { revisionId: parsed.data.revisionId },
    adminUserId: gate.ctx.user?.id,
  });

  return NextResponse.json({ success: true, product });
}
